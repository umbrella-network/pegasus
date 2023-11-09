import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings';
import {ChainStatusWithAddress, ChainsStatuses} from '../../types/ChainStatus';
import {ChainStatus} from '../../types/ChainStatus';
import {CanMint} from '../CanMint';
import {ValidatorRepository} from '../../repositories/ValidatorRepository';
import LeaderSelector from './LeaderSelector';

@injectable()
export class MultiChainStatusProcessor {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(CanMint) canMint!: CanMint;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;

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

    return {
      validators,
      nextLeader: LeaderSelector.apply(
        dataTimestamp,
        validators.map((v) => v.id),
        roundLength,
      ),
      chainsStatuses,
      chainsIdsReadyForBlock,
    };
  }
}
