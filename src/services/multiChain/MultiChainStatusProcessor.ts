import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {ChainStatusWithAddress, ChainsStatuses} from '../../types/ChainStatus.js';
import {CanMint} from '../CanMint.js';
import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import {LeaderSelector} from './LeaderSelector.js';
import {LeaderSelectorV2} from "./LeaderSelectorV2.js";

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(CanMint) canMint!: CanMint;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;
  @inject(LeaderSelector) leaderSelector!: LeaderSelector;
  @inject(LeaderSelectorV2) leaderSelectorV2!: LeaderSelectorV2;

  async apply(chainStatuses: ChainStatusWithAddress[], dataTimestamp: number): Promise<ChainsStatuses> {
    return this.processStates(chainStatuses, dataTimestamp);
  }

  private async processStates(
    chainsStatuses: ChainStatusWithAddress[],
    dataTimestamp: number,
  ): Promise<ChainsStatuses> {
    const validators = await this.validatorRepository.list(undefined);

    if (validators.length == 0) {
      throw new Error('[MultiChainStatusProcessor] empty validators list');
    }

    const chainsIdsReadyForBlock = chainsStatuses
      .filter((chain) => this.canMint.apply({chainStatus: chain.chainStatus, dataTimestamp, chainId: chain.chainId}))
      .map((chain) => chain.chainId);

    const roundLength = chainsStatuses.reduce((acc, {chainStatus}) => Math.min(acc, chainStatus.timePadding), 99999);

    // TODO for v2 use chainsIdsReadyForBlock to filter out leader who can not, but how others will know?
    // we have to process /info/ when we fetching validators
    // or we simply work based on BANK always
    const nextLeader= this.leaderSelector.apply(
      dataTimestamp,
      validators.map((v) => v.id),
      roundLength,
    );

    return {
      validators,
      nextLeader,
      chainsStatuses,
      chainsIdsReadyForBlock,
    };
  }
}
