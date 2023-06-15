import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {BigNumber} from 'ethers';
import {Validator} from '../types/Validator';
import CachedValidator from '../models/CachedValidator';
import {Logger} from 'winston';
import {ChainStatus} from '../types/ChainStatus';

@injectable()
export class ValidatorRepository {
  @inject('Logger') logger!: Logger;

  async list(): Promise<Validator[]> {
    this.logger.debug('[ValidatorRepository] pulling cached list of validators');
    const list = await getModelForClass(CachedValidator).find().sort({contractIndex: 1}).exec();

    return list.map((data): Validator => {
      return {
        id: data.address,
        power: BigNumber.from(data.power),
        location: data.location,
      };
    });
  }

  async cache(masterChainStatus: ChainStatus): Promise<void> {
    const ids = masterChainStatus.validators.map((address) => `validator::${address.toLowerCase()}`);
    await getModelForClass(CachedValidator).deleteMany({_id: {$nin: ids}});
    const CachedValidatorModel = getModelForClass(CachedValidator);

    await Promise.all(
      masterChainStatus.validators.map((address, i) => {
        const id = `validator::${address.toLowerCase()}`;

        return CachedValidatorModel.findOneAndUpdate(
          {_id: id},
          {
            _id: id,
            contractIndex: i,
            address,
            location: masterChainStatus.locations[i],
            power: masterChainStatus.powers[i].toString(),
            updatedAt: new Date(),
          },
          {upsert: true, new: true},
        ).exec();
      }),
    );
  }

  parse(masterChainStatus: ChainStatus): Validator[] {
    return masterChainStatus.validators.map((address, i): Validator => {
      return {
        id: address,
        location: masterChainStatus.locations[i],
        power: masterChainStatus.powers[i],
      };
    });
  }
}
