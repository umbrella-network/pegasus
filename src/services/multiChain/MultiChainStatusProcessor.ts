import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings';
import {ChainStatusWithAddress, ChainsStatuses} from '../../types/ChainStatus';
import LeaderSelector from './LeaderSelector';
import {ChainStatus} from '../../types/ChainStatus';
import {CanMint} from '../CanMint';

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(CanMint) CanMint!: CanMint;

  apply(chainStatuses: ChainStatusWithAddress[], dataTimestamp: number): ChainsStatuses {
    return this.processStates(chainStatuses, dataTimestamp);
  }

  findMasterChain = (chainStatuses: ChainStatusWithAddress[]): ChainStatus => {
    const masterChain = chainStatuses.find(
      (chainStatus) => chainStatus.chainId === this.settings.blockchain.masterChain.chainId,
    );

    if (!masterChain) throw new Error('[MultiChainStatusProcessor] master chainId missing');

    return masterChain.chainStatus;
  };

  private processStates(chainsStatuses: ChainStatusWithAddress[], dataTimestamp: number): ChainsStatuses {
    const masterChainStatus = this.findMasterChain(chainsStatuses);

    const chainsIdsReadyForBlock = chainsStatuses
      .filter((chain) => this.CanMint.apply({chainStatus: chain.chainStatus, dataTimestamp, chainId: chain.chainId}))
      .map((chain) => chain.chainId);

    return {
      validators: masterChainStatus.validators,
      nextLeader: LeaderSelector.apply(dataTimestamp, masterChainStatus),
      chainsStatuses,
      chainsIdsReadyForBlock,
    };
  }
}
