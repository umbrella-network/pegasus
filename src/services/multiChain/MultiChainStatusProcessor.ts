import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings';
import {ChainStatusWithAddress, MultiChainStatuses} from '../../types/MultiChain';
import {chainReadyForNewBlock} from '../../utils/mining';
import LeaderSelector from './LeaderSelector';
import {ChainStatus} from '../../types/ChainStatus';

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;

  apply(chainStatuses: ChainStatusWithAddress[], dataTimestamp: number): MultiChainStatuses {
    return this.processStates(chainStatuses, dataTimestamp);
  }

  private findMasterChain = (chainStatuses: ChainStatusWithAddress[]): ChainStatus => {
    const masterChain = chainStatuses.find(
      (chainStatus) => chainStatus.chainId === this.settings.blockchain.masterChain.chainId,
    );

    if (!masterChain) throw new Error('[MultiChainStatusProcessor] master chainId missing');

    return masterChain.chainStatus;
  };

  private processStates(chainsStatuses: ChainStatusWithAddress[], dataTimestamp: number): MultiChainStatuses {
    const masterChainStatus = this.findMasterChain(chainsStatuses);

    const chainsIdsReadyForBlock = chainsStatuses
      .filter((chain) => this.canMint(chain, dataTimestamp))
      .map((chain) => chain.chainId);

    return {
      validators: masterChainStatus.validators,
      nextLeader: LeaderSelector.apply(dataTimestamp, masterChainStatus),
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
