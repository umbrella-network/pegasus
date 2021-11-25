import {injectable} from 'inversify';
import {BlockchainSymbol, Token} from '../../models/BlockchainSymbol';
import {getModelForClass} from '@typegoose/typegoose';
import verifiedTokens from './uniswapVerifiedTokens.json';

@injectable()
export class UniswapPoolService {
  static BLOCKCHAIN_ID = 'ethereum';
  static SYMBOL_TYPE = 'uniswap-pool';
  static VERIFIED_TOKENS: Set<string> = new Set(verifiedTokens);

  async getVerifiedPools(): Promise<BlockchainSymbol[]> {
    return await getModelForClass(BlockchainSymbol)
      .find({ ...this.getSymbolBaseFilter(), verified: false })
      .exec();
  }

  async upsert(props: { symbol: string, tokens: Token[], fee: number }): Promise<BlockchainSymbol> {
    const { symbol, tokens, fee } = props;
    const filter = { ...this.getSymbolBaseFilter(), symbol };
    const attributes = { ...filter, tokens, verified: this.isVerified(tokens), meta: { fee } };

    return getModelForClass(BlockchainSymbol)
      .findOneAndUpdate(
        filter,
        attributes,
        { upsert: true, new: true }
      )
      .exec();
  }

  async updatePoolVerificationStatus(): Promise<void> {
    const unverifiedPools = await getModelForClass(BlockchainSymbol)
      .find({ ...this.getSymbolBaseFilter(), verified: false })
      .exec();

    for (const pool of unverifiedPools) {
      if (!this.isVerified(pool.tokens)) continue;

      pool.verified = true;
      await pool.save()
    }
  }

  getSymbolBaseFilter(): { [key: string]: string } {
    return { blockchainId: UniswapPoolService.BLOCKCHAIN_ID, type: UniswapPoolService.SYMBOL_TYPE };
  }

  getPoolSymbol(from: string, to: string): string {
    return [from, to].map(s => s.toLowerCase()).join('~');
  }

  isVerified(tokens: Token[]): boolean {
    return tokens.every(t => UniswapPoolService.VERIFIED_TOKENS.has(t.address));
  }
}
