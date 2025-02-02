import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings, {BlockchainType} from '../../types/Settings.js';
import {ChainsStatuses, ChainStatusWithAddress} from '../../types/ChainStatus.js';
import {CanMint} from '../CanMint.js';
import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import {LeaderSelector} from './LeaderSelector.js';

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(CanMint) canMint!: CanMint;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;

  private logPrefix = '[MultiChainStatusProcessor]';

  async apply(chainStatuses: ChainStatusWithAddress[], dataTimestamp: number): Promise<ChainsStatuses> {
    return this.processStates(chainStatuses, dataTimestamp);
  }

  private async processStates(
    chainsStatuses: ChainStatusWithAddress[],
    dataTimestamp: number,
  ): Promise<ChainsStatuses> {
    const validators = await this.validatorRepository.list(undefined, BlockchainType.LAYER2);

    if (validators.length == 0) {
      throw new Error(`${this.logPrefix} empty validators list`);
    }

    const chainsIdsReadyForBlock = chainsStatuses
      .filter((chain) => this.canMint.apply({chainStatus: chain.chainStatus, dataTimestamp, chainId: chain.chainId}))
      .map((chain) => chain.chainId);

    const roundLength = chainsStatuses.reduce((acc, {chainStatus}) => Math.min(acc, chainStatus.timePadding), 99999);

    return {
      validators,
      nextLeader: LeaderSelector.apply(dataTimestamp, validators, roundLength),
      chainsStatuses,
      chainsIdsReadyForBlock,
    };
  }
}
