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
import {ReleasesResolver} from '../services/files/ReleasesResolver.js';

@injectable()
export class ValidatorRepository {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ReleasesResolver) releasesResolver!: ReleasesResolver;

  private logPrefix = '[ValidatorRepository]';

  private async list_deprecated(chainId: ChainsIds | undefined): Promise<Validator[]> {
    if (!chainId) {
      chainId = await this.anyChainWithList_deprecated();
    }

    this.logger.debug(`${this.logPrefix} pulling cached list of validators for ${chainId}`);
    const validators = await getModelForClass(CachedValidator).find({chainId}).exec();

    return validators
      .sort((a, b) => (a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1))
      .map((data): Validator => {
        return {
          id: data.address,
          power: BigNumber.from(data.power),
          location: data.location,
        };
      });
  }

  async list(chainId: ChainsIds | undefined, chainType: BlockchainType): Promise<Validator[]> {
    if (!(await this.releasesResolver.get('leaderSelectorV2'))) {
      this.logger.info(`${this.logPrefix} using old list for ${chainId}`);
      return this.list_deprecated(chainId);
    } else {
      this.logger.debug(`${this.logPrefix} using leaderSelectorV2`);
    }

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
      const location = this.processLocation(data.location);
      counter[location] = (counter[location] ?? 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counter));

    const selectedValidators = validators
      .filter((data: CachedValidator) => {
        const location = this.processLocation(data.location);
        return counter[location] == maxCount;
      })
      .map((data: CachedValidator) => {
        const location = this.processLocation(data.location);
        return evmValidators[location];
      });

    this.logger.debug(`${this.logPrefix} selectedValidators (${maxCount}): ${JSON.stringify(selectedValidators)}`);

    return sortValidators(selectedValidators);
  }

  async getAll(): Promise<DataCollection<Set<string>>> {
    const result: DataCollection<Set<string>> = {};
    const validators = await getModelForClass(CachedValidator).find().exec();

    validators.forEach((data) => {
      if (!result[data.chainId]) {
        result[data.chainId] = new Set<string>();
      }

      // remove `/` from the end
      result[data.chainId].add(this.processLocation(data.location));
    });

    return result;
  }

  protected async anyChainWithList_deprecated(): Promise<ChainsIds | undefined> {
    const allCachedChains = await getModelForClass(CachedValidator)
      .find({}, {chainId: 1})
      .sort({contractIndex: 1})
      .exec();

    if (!allCachedChains) return;

    const one = allCachedChains.find((doc) => !NonEvmChainsIds.includes(doc.chainId as ChainsIds));

    return one?.chainId as ChainsIds;
  }

  private async evmValidators(): Promise<Record<string, Validator>> {
    const evmValidators = await getModelForClass(CachedValidator)
      .find({chainId: {$nin: NonEvmChainsIds}})
      .exec();
    const byLocation: Record<string, Validator> = {};

    evmValidators.forEach((evmValidator) => {
      const location = this.processLocation(evmValidator.location);

      byLocation[location] = {
        id: evmValidator.address,
        power: BigNumber.from(evmValidator.power),
        location,
      };
    });

    return byLocation;
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

  private processLocation(url: string): string {
    const noSlash = url.endsWith('/') ? url.slice(0, -1) : url;
    return noSlash.toLowerCase();
  }
}
