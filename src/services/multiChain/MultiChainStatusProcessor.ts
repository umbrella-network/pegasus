import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings';
import {ChainStatusWithAddress, ChainsStatuses} from '../../types/ChainStatus';
import {ChainStatus} from '../../types/ChainStatus';
import {CanMint} from '../CanMint';
import {LeaderSelectorCompatible} from "./LeaderSelectorCompatible";

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(CanMint) canMint!: CanMint;
  @inject(LeaderSelectorCompatible) leaderSelectorCompatible!: LeaderSelectorCompatible;

  async apply(chainStatuses: ChainStatusWithAddress[], dataTimestamp: number): Promise<ChainsStatuses> {
    return this.processStates(chainStatuses, dataTimestamp);
  }

  findMasterChain = (chainStatuses: ChainStatusWithAddress[]): ChainStatus => {
    const masterChain = chainStatuses.find(
      (chainStatus) => chainStatus.chainId === this.settings.blockchain.masterChain.chainId,
    );

    if (!masterChain) throw new Error('[MultiChainStatusProcessor] master chainId missing');

    return masterChain.chainStatus;
  };

  private async processStates(chainsStatuses: ChainStatusWithAddress[], dataTimestamp: number): Promise<ChainsStatuses> {
    const masterChainStatus = this.findMasterChain(chainsStatuses);

    const chainsIdsReadyForBlock = chainsStatuses
      .filter((chain) => this.canMint.apply({chainStatus: chain.chainStatus, dataTimestamp, chainId: chain.chainId}))
      .map((chain) => chain.chainId);

    const roundLength = chainsStatuses.reduce((acc, {chainStatus}) => Math.min(acc, chainStatus.timePadding), 99999);

    return {
      validators: masterChainStatus.validators,
      nextLeader: await this.leaderSelectorCompatible.apply(dataTimestamp, masterChainStatus, roundLength),
      chainsStatuses,
      chainsIdsReadyForBlock,
    };
  }
}
