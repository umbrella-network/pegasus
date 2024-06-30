import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {BigNumber} from 'ethers';
import {Validator} from '../types/Validator.js';
import CachedValidator from '../models/CachedValidator.js';
import {Logger} from 'winston';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds.js';
import {DataCollection} from '../types/custom.js';

@injectable()
export class ValidatorRepository {
  @inject('Logger') logger!: Logger;

  async list(chainId: ChainsIds | undefined): Promise<Validator[]> {
    if (!chainId) {
      chainId = await this.anyChainWithList();
    }

    this.logger.debug(`[ValidatorRepository] pulling cached list of validators for ${chainId}`);
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

  async getAll(): Promise<DataCollection<Set<string>>> {
    const result: DataCollection<Set<string>> = {};
    const validators = await getModelForClass(CachedValidator).find().exec();

    validators.forEach((data) => {
      if (!result[data.chainId]) {
        result[data.chainId] = new Set<string>();
      }

      // remove `/` from the end
      result[data.chainId].add(data.location.endsWith('/') ? data.location.slice(0, -1) : data.location);
    });

    return result;
  }

  protected async anyChainWithList(): Promise<ChainsIds | undefined> {
    const allCachedChains = await getModelForClass(CachedValidator)
      .find({}, {chainId: 1})
      .sort({contractIndex: 1})
      .exec();

    if (!allCachedChains) return;

    const one = allCachedChains.find((doc) => !NonEvmChainsIds.includes(doc.chainId as ChainsIds));

    return one?.chainId as ChainsIds;
  }

  async cache(chainId: ChainsIds, validators: Validator[]): Promise<void> {
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
}
