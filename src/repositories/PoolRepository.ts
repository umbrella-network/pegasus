import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {Pools} from '../models/Pools.js';

@injectable()
export class PoolRepository {
  async upsert(props: {
    chainId: string;
    dexProtocol: string;
    token0: string;
    token1: string;
    fee: number;
    pool: string;
  }): Promise<Pools> {
    const {chainId, dexProtocol, token0, token1, fee, pool} = props;
    const filter = {chainId, dexProtocol, pool, token0, token1};

    const attributes = {
      chainId,
      dexProtocol,
      token0,
      token1,
      fee,
      pool,
      lastUpdatedAt: new Date(),
    };

    return getModelForClass(Pools).findOneAndUpdate(filter, attributes, {upsert: true, new: true}).exec();
  }

  async find(props: {protocol: string; chainFrom: string[]; token0: string; token1: string}): Promise<Pools[]> {
    const {protocol, chainFrom, token0, token1} = props;
    const filter = {protocol, chainId: {$in: chainFrom}, token0, token1};

    return getModelForClass(Pools).find(filter).exec();
  }
}
