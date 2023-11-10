import {inject, injectable} from 'inversify';
import NodeCache from 'node-cache';
import {getModelForClass} from '@typegoose/typegoose';

import {BlockchainSymbol, Token} from '../../models/BlockchainSymbol.js';
import {LocalAssetRepository} from '../../repositories/LocalAssetRepository.js';

@injectable()
export class UniswapPoolService {
  static BLOCKCHAIN_ID = 'ethereum';
  static SYMBOL_TYPE = 'uniswap-pool';

  verifiedTokenCache: NodeCache;
  @inject(LocalAssetRepository) localAssetRepository!: LocalAssetRepository;

  constructor() {
    this.verifiedTokenCache = new NodeCache({stdTTL: 600});
  }

  async getVerifiedPools(): Promise<BlockchainSymbol[]> {
    return await getModelForClass(BlockchainSymbol)
      .find({...this.getSymbolBaseFilter(), verified: true})
      .exec();
  }

  async upsert(props: {symbol: string; tokens: Token[]; fee: number}): Promise<BlockchainSymbol> {
    const {symbol, tokens, fee} = props;
    const filter = {...this.getSymbolBaseFilter(), symbol};

    const attributes = {
      ...filter,
      tokens,
      lastUpdatedAt: new Date(),
      verified: await this.isVerified(tokens),
      meta: {fee},
    };

    return getModelForClass(BlockchainSymbol).findOneAndUpdate(filter, attributes, {upsert: true, new: true}).exec();
  }

  async updatePoolVerificationStatus(): Promise<void> {
    const unverifiedPools = await getModelForClass(BlockchainSymbol)
      .find({...this.getSymbolBaseFilter(), verified: false})
      .exec();

    for (const pool of unverifiedPools) {
      if (!(await this.isVerified(pool.tokens))) continue;

      pool.verified = true;
      await pool.save();
    }
  }

  getSymbolBaseFilter(): {[key: string]: string} {
    return {blockchainId: UniswapPoolService.BLOCKCHAIN_ID, type: UniswapPoolService.SYMBOL_TYPE};
  }

  getPoolSymbol(from: string, to: string): string {
    return [from, to].map((s) => s.toLowerCase()).join('~');
  }

  async isVerified(tokens: Token[]): Promise<boolean> {
    const verifiedTokens = await this.getVerifiedTokens();
    return tokens.every((t) => verifiedTokens.has(t.address));
  }

  private async getVerifiedTokens(): Promise<Set<string>> {
    if (this.verifiedTokenCache.has('tokens')) return <Set<string>>this.verifiedTokenCache.get('tokens');

    let tokens: Set<string>;

    try {
      const data = <string>await this.localAssetRepository.read('uniswapVerifiedTokens.json');
      const parsedData = <string[]>JSON.parse(data);
      tokens = new Set(parsedData.map((s) => s.toLowerCase()));
    } catch (e) {
      tokens = new Set<string>();
    }

    this.verifiedTokenCache.set<Set<string>>('tokens', tokens);
    return tokens;
  }
}
