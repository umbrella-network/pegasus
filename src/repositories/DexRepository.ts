import {injectable} from 'inversify';

import {getModelForClass} from '@typegoose/typegoose';
import {Dexes} from '../models/Dexes.js';

@injectable()
export class DexRepository {
  async upsert(props: {
    chainId: string;
    dexProtocol: string;
    token0: string;
    token1: string;
    fee: number;
    pool: string;
  }): Promise<Dexes> {
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

    return getModelForClass(Dexes).findOneAndUpdate(filter, attributes, {upsert: true, new: true}).exec();
  }

  async find(props: {dexProtocol: string; token0: string; token1: string}): Promise<Dexes[]> {
    const {dexProtocol, token0, token1} = props;
    const filter = {dexProtocol, token0, token1};

    return getModelForClass(Dexes).find(filter).exec();
  }
}
