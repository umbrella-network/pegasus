import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {BigNumber} from 'ethers';
import {Logger} from 'winston';

import {Validator} from '../types/Validator.js';
import CachedValidator from '../models/CachedValidator.js';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds.js';
import {DataCollection} from '../types/custom.js';
import Settings, {BlockchainType} from '../types/Settings.js';
import {sortValidators} from '../utils/sortValidators.js';

@injectable()
export class ValidatorRepository {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;

  private logPrefix = '[ValidatorRepository]';

  async listForLeaderSelection(chainId: ChainsIds | undefined, chainType: BlockchainType): Promise<Validator[]> {
    const chains = this.chainIdsForType(chainType);

    if (!chainId) {
      [chainId] = chains;
    }

    this.logger.debug(`${this.logPrefix} pulling cached list of validators for ${chainId}`);

    const counter: Record<string, number> = {};

    const [validators, evmValidators] = await Promise.all([
      getModelForClass(CachedValidator)
        .find({chainId: {$in: chains}})
        .exec(),
      this.evmValidators(),
    ]);

    this.logger.debug(`${this.logPrefix} evmValidators: ${JSON.stringify(evmValidators)}`);

    validators.forEach((data: CachedValidator) => {
      const location = this.procesLocation(data.location);
      counter[location] = (counter[location] ?? 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counter));

    const selectedValidators = validators
      .filter((data: CachedValidator) => {
        const location = this.procesLocation(data.location);
        return counter[location] == maxCount;
      })
      .map((data: CachedValidator) => {
        const location = this.procesLocation(data.location);
        return evmValidators[location];
      });

    this.logger.debug(`${this.logPrefix} selectedValidators (${maxCount}): ${JSON.stringify(selectedValidators)}`);

    return sortValidators(selectedValidators);
  }

  private async evmValidators(): Promise<Record<string, Validator>> {
    const evmValidators = await getModelForClass(CachedValidator).find({chainId: {$nin: NonEvmChainsIds}}).exec();
    const byLocation: Record<string, Validator> = {};

    evmValidators.forEach((evmValidator) => {
      const location = this.procesLocation(evmValidator.location);

      byLocation[location] = {
        id: evmValidator.address,
        power: BigNumber.from(evmValidator.power),
        location,
      };
    });

    return byLocation;
  }

  async getAll(): Promise<DataCollection<Set<string>>> {
    const result: DataCollection<Set<string>> = {};
    const validators = await getModelForClass(CachedValidator).find().exec();

    validators.forEach((data) => {
      if (!result[data.chainId]) {
        result[data.chainId] = new Set<string>();
      }

      // remove `/` from the end
      result[data.chainId].add(this.procesLocation(data.location));
    });

    return result;
  }

  protected chainIdsForType(chainType: BlockchainType): ChainsIds[] {
    return Object.entries(this.settings.blockchain.multiChains)
      .map(([chainId, cfg]) => {
        return cfg.type.includes(chainType) ? chainId : undefined;
      })
      .filter((v) => v !== undefined) as ChainsIds[];
  }

  async cache(chainId: ChainsIds, validators: Validator[]): Promise<void> {
    if (validators.length == 0) throw new Error('[ValidatorRepository] empty validators list');

    await getModelForClass(CachedValidator).deleteMany({chainId});
    const CachedValidatorModel = getModelForClass(CachedValidator);

    await Promise.all(
      validators.map((validator, i) => {
        const id = `validator::${validator.id.toLowerCase()}@${chainId}`;

        return CachedValidatorModel.findOneAndUpdate(
          {_id: id},
          {
            _id: id,
            chainId,
            contractIndex: i,
            address: validator.id,
            location: validator.location,
            power: validator.power.toString(),
            updatedAt: new Date(),
          },
          {upsert: true, new: true},
        ).exec();
      }),
    );
  }

  private procesLocation(url: string): string {
    const noSlash = url.endsWith('/') ? url.slice(0, -1) : url;
    return noSlash.toLowerCase();
  }
}
