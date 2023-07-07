import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {BigNumber} from 'ethers';
import {Validator} from '../types/Validator';
import CachedValidator from '../models/CachedValidator';
import {Logger} from 'winston';
import {ChainsIds} from '../types/ChainsIds';

@injectable()
export class ValidatorRepository {
  @inject('Logger') logger!: Logger;

  async list(chainId: ChainsIds | undefined): Promise<Validator[]> {
    if (!chainId) {
      chainId = await this.anyChainWithList();
    }

    this.logger.debug(`[ValidatorRepository] pulling cached list of validators for ${chainId}`);
    const list = await getModelForClass(CachedValidator).find({chainId}).sort({contractIndex: 1}).exec();

    return list.map((data): Validator => {
      return {
        id: data.address,
        power: BigNumber.from(data.power),
        location: data.location,
      };
    });
  }

  protected async anyChainWithList(): Promise<ChainsIds | undefined> {
    const one = await getModelForClass(CachedValidator).findOne({}, {chainId: 1}).sort({contractIndex: 1}).exec();
    if (!one) return;

    return one.chainId as ChainsIds;
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
