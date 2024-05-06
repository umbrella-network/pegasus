import {getModelForClass} from '@typegoose/typegoose';

import {Pool} from './SovrynPoolScanner.js';
import {Pool as PoolSymbol} from '../../models/Pool.js';

export type SearchToken = {
  address: string;
  token0?: string;
  token1?: string;
};

export abstract class PoolRepositoryBase {
  abstract upsert(pool: Pool): Promise<boolean>;
  abstract find(searchToken: SearchToken): Promise<Pool[]>;
}

export class SovrynPoolRepository extends PoolRepositoryBase {
  async upsert(pool: Pool): Promise<boolean> {
    const attributes = {
      ...pool,
      lastUpdatedAt: new Date(),
    };

    const searchToken = {address: pool.address};

    await getModelForClass(PoolSymbol).findOneAndUpdate(searchToken, attributes, {upsert: true, new: true}).exec();

    return Promise.resolve(true);
  }

  async find(searchToken: SearchToken): Promise<Pool[]> {
    const pools = await getModelForClass(PoolSymbol)
      .find({...searchToken, verified: true})
      .exec();

    return pools;
  }
}
