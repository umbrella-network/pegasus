import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';

import {UniswapV3Pool} from '../models/UniswapV3Pool.js';
import {ChainsIds} from '../types/ChainsIds.js';
import Settings from '../types/Settings.js';
import {DexProtocolName} from '../types/Dexes.js';

export type SavePoolParams = {
  chainId: string;
  protocol: string;
  token0: string;
  token1: string;
  fee: number;
  address: string;
};

export type SaveLiquidityParams = {
  liquidityLockedToken0: number;
  liquidityLockedToken1: number;
};

type LiquidityFilterParams = {chainId: ChainsIds; address: string};

@injectable()
export class UniswapV3PoolRepository {
  @inject('Settings') protected settings!: Settings;
  @inject('Logger') protected logger!: Logger;

  async savePool(props: SavePoolParams): Promise<void> {
    const uniswapV3PoolModel = getModelForClass(UniswapV3Pool);

    await uniswapV3PoolModel.findOneAndUpdate(
      {
        chainId: props.chainId,
        address: props.address.toLowerCase(),
      },
      {
        chainId: props.chainId,
        protocol: props.protocol,
        token0: props.token0.toLowerCase(),
        token1: props.token1.toLowerCase(),
        fee: props.fee,
        address: props.address.toLowerCase(),
      },
      {
        upsert: true,
      },
    );
  }

  async saveLiquidity(filter: LiquidityFilterParams, liquidity: SaveLiquidityParams): Promise<UniswapV3Pool | null> {
    return getModelForClass(UniswapV3Pool)
      .findOneAndUpdate(
        {...filter},
        {...liquidity, liquidityUpdatedAt: new Date(Date.now())},
        {
          new: true,
        },
      )
      .exec();
  }

  async find(props: {
    protocol: string;
    fromChain: string;
    tokens: {base: string; quote: string}[];
  }): Promise<UniswapV3Pool[]> {
    const {protocol, fromChain, tokens} = props;

    const allCases = tokens.map((t) => {
      return [
        {token0: t.base.toLowerCase(), token1: t.quote.toLowerCase()},
        {token1: t.base.toLowerCase(), token0: t.quote.toLowerCase()},
      ];
    });

    const filter = {
      protocol,
      chainId: fromChain,
      $or: allCases.flat(),
    };

    return getModelForClass(UniswapV3Pool).find(filter).exec();
  }

  async findBestPool(props: {
    protocol: string;
    fromChain: string;
    base: string;
    quote: string;
  }): Promise<UniswapV3Pool | undefined> {
    const {protocol, fromChain} = props;
    const base = props.base.toLowerCase();
    const quote = props.quote.toLowerCase();

    const liquidityFreshness = this.getLiquidityFreshness(fromChain as ChainsIds, protocol as DexProtocolName);
    const liquidityUpdatedLimit = new Date(Date.now() - liquidityFreshness);

    const filterPools = {
      protocol,
      chainId: fromChain,
      $or: [
        {token0: base, token1: quote},
        {token0: quote, token1: base},
      ],
      liquidityUpdatedAt: {$gt: liquidityUpdatedLimit},
    };

    const result = await getModelForClass(UniswapV3Pool).find(filterPools).exec();

    if (result.length === 0) {
      this.logger.debug(`[UniswapV3PoolRepository] no pool for query: ${JSON.stringify(filterPools)}`);
      
      return undefined;
    }

    if (result.length === 1) {
      return result[0];
    }

    const poolsSortedDesc = result.sort((a, b) => {
      const liquidityA = quote == a.token0 ? a.liquidityLockedToken0 : a.liquidityLockedToken1;
      const liquidityB = quote == b.token0 ? b.liquidityLockedToken0 : b.liquidityLockedToken1;
      return liquidityB - liquidityA;
    });

    return poolsSortedDesc[0];
  }

  private getLiquidityFreshness(chainId: ChainsIds, protocol: DexProtocolName): number {
    return this.settings.dexes[chainId]?.[protocol]?.liquidityFreshness || this.getDayInMillisecond(365);
  }

  private getDayInMillisecond(days: number): number {
    return days * 1000 * 60 * 60 * 24;
  }
}
