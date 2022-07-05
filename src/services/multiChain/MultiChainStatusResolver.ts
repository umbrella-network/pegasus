import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import ChainContract from '../../contracts/ChainContract';
import Settings from '../../types/Settings';
import {ChainContractRepository} from '../../repositories/ChainContractRepository';
import {promiseWithTimeout} from '../../utils/promiseWithTimeout';
import {ChainsIds} from '../../types/ChainsIds';
import {ChainStatusResolved, IResolveStatus} from '../../types/MultiChain';
import {ChainStatus} from 'src/types/ChainStatus';

@injectable()
export class MultiChainStatusResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  private masterChainContract!: ChainContract;
  private chainContractList: {chainId: string; contract: ChainContract}[] = [];

  constructor(
    @inject(ChainContractRepository) chainContractRepository: ChainContractRepository,
    @inject('Settings') settings: Settings,
  ) {
    this.masterChainContract = <ChainContract>chainContractRepository.get(settings.blockchain.masterChain.chainId);
    this.chainContractRepository = chainContractRepository;
    this.setChainContractList();
  }

  async apply(): Promise<IResolveStatus> {
    const result = await Promise.allSettled(this.getResolveStatusWithTimeout());
    const chainStatusResolved = result.reduce(this.getChainStatusResolved, []);

    return this.processStates(chainStatusResolved);
  }

  private getResolveStatusWithTimeout = (): Promise<[string, ChainStatus]>[] => {
    return [
      ...this.chainContractList.map((chainContract) =>
        promiseWithTimeout(chainContract.contract.resolveStatus(), this.settings.blockchain.resolveStatusTimeout),
      ),
    ];
  };

  private logErrorMessages = (chainId: string, reason: string): void => {
    this.logger.error(`[MultiChainStatusResolver] chain ${chainId} failed to get status. ${reason}`);
  };

  private getChainStatusResolved = (
    acc: ChainStatusResolved[],
    curr: PromiseSettledResult<[string, ChainStatus]>,
    i: number,
  ): ChainStatusResolved[] => {
    const chainId = this.chainContractList[i].chainId;

    if (curr.status === 'rejected') {
      this.logErrorMessages(chainId, JSON.stringify(curr.reason));
      return acc;
    }

    acc.push({
      chainId,
      chainAddress: curr.value[0],
      chainStatus: curr.value[1],
    });

    return acc;
  };

  private setChainContractList = (): void => {
    Object.values(ChainsIds).forEach((chainId) => {
      const chainContract = <ChainContract>this.chainContractRepository?.get(chainId);

      if (chainContract) {
        this.chainContractList.push({
          chainId,
          contract: chainContract,
        });
      }
    });
  };

  private getMasterChainStatus = (successful: ChainStatusResolved[]): ChainStatus | undefined => {
    const masterChain = successful.find((success) => success.chainId === this.settings.blockchain.masterChain.chainId);
    return masterChain?.chainStatus;
  };

  private processStates(chainStatusResolved: ChainStatusResolved[]): IResolveStatus {
    const masterChainStatus = this.getMasterChainStatus(chainStatusResolved);

    return {
      isAnySuccess: chainStatusResolved.length > 0,
      validators: masterChainStatus ? this.masterChainContract.resolveValidators(masterChainStatus) : undefined,
      nextLeader: masterChainStatus?.nextLeader,
      resolved: chainStatusResolved,
    };
  }
}
