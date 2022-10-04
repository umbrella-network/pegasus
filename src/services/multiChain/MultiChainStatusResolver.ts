import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import ChainContract from '../../contracts/ChainContract';
import Settings from '../../types/Settings';
import {ChainContractRepository} from '../../repositories/ChainContractRepository';
import {promiseWithTimeout} from '../../utils/promiseWithTimeout';
import {ChainsIds} from '../../types/ChainsIds';
import {ChainStatusWithAddress, ChainsStatuses} from '../../types/ChainStatus';
import {ChainStatus} from '../../types/ChainStatus';
import {MultiChainStatusProcessor} from './MultiChainStatusProcessor';

@injectable()
export class MultiChainStatusResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;
  @inject(MultiChainStatusProcessor) multiChainStatusProcessor!: MultiChainStatusProcessor;
  private chainContractList: {chainId: string; contract: ChainContract}[] = [];

  constructor(
    @inject(ChainContractRepository) chainContractRepository: ChainContractRepository,
    @inject('Settings') settings: Settings,
  ) {
    this.settings = settings;
    this.chainContractRepository = chainContractRepository;
    this.setChainContractList();
  }

  async apply(dataTimestamp: number): Promise<ChainsStatuses> {
    const result = await Promise.allSettled(this.getResolveStatusWithTimeout());
    const chainStatusWithAddress = result.reduce(this.getChainStatusWithAddress, []);
    return this.multiChainStatusProcessor.apply(chainStatusWithAddress, dataTimestamp);
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

  private getChainStatusWithAddress = (
    acc: ChainStatusWithAddress[],
    curr: PromiseSettledResult<[string, ChainStatus]>,
    i: number,
  ): ChainStatusWithAddress[] => {
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
}
