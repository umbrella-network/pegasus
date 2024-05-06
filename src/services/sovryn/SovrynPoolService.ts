import {injectable} from 'inversify';
import NodeCache from 'node-cache';
import {getModelForClass} from '@typegoose/typegoose';

import {BlockchainSymbol, Token} from '../../models/BlockchainSymbol.js';

@injectable()
export class SovrynPoolService {
  static BLOCKCHAIN_ID = 'rootstock';
  static SYMBOL_TYPE = 'sovryn-pool';

  verifiedTokenCache: NodeCache;

  constructor() {
    this.verifiedTokenCache = new NodeCache({stdTTL: 600});
  }

  async getPools(): Promise<BlockchainSymbol[]> {
    return await getModelForClass(BlockchainSymbol)
      .find({...this.getBaseSearchFilter(), verified: true})
      .exec();
  }

  async upsert(props: {symbol: string; tokens: Token[]; fee: number}): Promise<BlockchainSymbol> {
    const {symbol, tokens, fee} = props;
    const filter = {...this.getBaseSearchFilter(), symbol};

    const attributes = {
      ...filter,
      tokens,
      lastUpdatedAt: new Date(),
      verified: false,
      meta: {fee},
    };

    return getModelForClass(BlockchainSymbol).findOneAndUpdate(filter, attributes, {upsert: true, new: true}).exec();
  }

  getBaseSearchFilter(): {[key: string]: string} {
    return {blockchainId: SovrynPoolService.BLOCKCHAIN_ID, type: SovrynPoolService.SYMBOL_TYPE};
  }
}
