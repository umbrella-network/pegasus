import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings';
import {ChainStatusWithAddress, ChainsStatuses} from '../../types/MultiChain';
import {ChainStatus} from '../../types/ChainStatus';
import {chainReadyForNewBlock} from '../../utils/mining';

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;

  apply(chainStatuses: ChainStatusWithAddress[], dataTimestamp: number): ChainsStatuses {
    return this.processStates(chainStatuses, dataTimestamp);
  }

  private findMasterChainStatus = (chainStatuses: ChainStatusWithAddress[]): ChainStatus => {
    const masterChain = chainStatuses.find(
      (chainStatus) => chainStatus.chainId === this.settings.blockchain.masterChain.chainId,
    );

    if (!masterChain) throw new Error('[MultiChainStatusProcessor] master chainId missing');

    return masterChain.chainStatus;
  };

  private processStates(chainsStatuses: ChainStatusWithAddress[], dataTimestamp: number): ChainsStatuses {
    const masterChainStatus = this.findMasterChainStatus(chainsStatuses);

    const chainsIdsReadyForBlock = chainsStatuses
      .filter((chain) => this.canMint(chain, dataTimestamp))
      .map((chain) => chain.chainId);

    return {
      validators: masterChainStatus?.validators,
      nextLeader: masterChainStatus?.nextLeader,
      chainsStatuses,
      chainsIdsReadyForBlock,
    };
  }

  private canMint(chainStatus: ChainStatusWithAddress, dataTimestamp: number): boolean {
    const [ready, error] = chainReadyForNewBlock(chainStatus.chainStatus, dataTimestamp);

    error &&
      this.logger.info(
        `[canMint] Error while checking if chainId ${chainStatus.chainId} is available to mint ${error}`,
      );

    return ready;
  }
}
