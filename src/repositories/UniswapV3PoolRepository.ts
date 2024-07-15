import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {UniswapV3Pool} from '../models/UniswapV3Pool.js';
import {ChainsIds} from '../types/ChainsIds.js';
import Settings from '../types/Settings.js';
import {DexProtocolName} from 'src/types/Dexes.js';

type SavePoolParams = {
  chainId: string;
  protocol: string;
  token0: string;
  token1: string;
  fee: number;
  address: string;
};

export type SaveLiquidityParams = {
  liquidityActive: string;
  liquidityLockedToken0: number;
  liquidityLockedToken1: number;
};

type LiquidityFilterParams = {chainId: ChainsIds; token0: string; token1: string; fee: number; address: string};

@injectable()
export class UniswapV3PoolRepository {
  @inject('Settings') protected settings!: Settings;

  async savePool(props: SavePoolParams): Promise<UniswapV3Pool> {
    const UniswapV3PoolModel = getModelForClass(UniswapV3Pool);

    const uniswapV3PoolData = new UniswapV3PoolModel({
      ...props,
      token0: props.token0.toLowerCase(),
      token1: props.token1.toLowerCase(),
      createdDate: new Date(Date.now()),
    });

    return uniswapV3PoolData.save();
  }

  async saveLiquidity(filter: LiquidityFilterParams, liquidity: SaveLiquidityParams): Promise<UniswapV3Pool | null> {
    const token0 = filter.token0.toLowerCase();
    const token1 = filter.token1.toLowerCase();

    return getModelForClass(UniswapV3Pool)
      .findOneAndUpdate(
        {...filter, token0: {$in: [token0, token1]}, token1: {$in: [token0, token1]}},
        {...liquidity, liquidityUpdatedAt: new Date(Date.now())},
        {
          new: true,
        },
      )
      .exec();
  }

  async find(props: {protocol: string; fromChain: string; token0: string; token1: string}): Promise<UniswapV3Pool[]> {
    const {protocol, fromChain} = props;
    const token0 = props.token0.toLowerCase();
    const token1 = props.token1.toLowerCase();

    const filter = {
      protocol,
      chainId: fromChain,
      token0: {$in: [token0, token1]},
      token1: {$in: [token0, token1]},
    };

    return getModelForClass(UniswapV3Pool).find(filter).sort({token0: 1, token1: 1}).exec();
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

    const filterToken0 = {
      protocol,
      chainId: fromChain,
      token0: quote,
      token1: base,
      liquidityUpdatedAt: {$gt: liquidityUpdatedLimit},
    };

    const filterToken1 = {
      protocol,
      chainId: fromChain,
      token0: base,
      token1: quote,
      liquidityUpdatedAt: {$gt: liquidityUpdatedLimit},
    };

    const [liquidityToken0, liquidityToken1] = await Promise.all([
      getModelForClass(UniswapV3Pool).find(filterToken0).sort({liquidityLockedToken0: 1}).exec(),
      getModelForClass(UniswapV3Pool).find(filterToken1).sort({liquidityLockedToken1: 1}).exec(),
    ]);

    if (liquidityToken0.length === 0 && liquidityToken1.length === 0) {
      return undefined;
    }

    if (liquidityToken0.length > 0 && liquidityToken1.length === 0) {
      return liquidityToken0[0];
    }

    if (liquidityToken1.length > 0 && liquidityToken0.length === 0) {
      return liquidityToken1[0];
    }

    // TODO Needs to be done for quote liquidity
    return liquidityToken0[0].liquidityLockedToken0 > liquidityToken1[0].liquidityLockedToken1
      ? liquidityToken0[0]
      : liquidityToken1[0];
  }

  private getLiquidityFreshness(chainId: ChainsIds, protocol: DexProtocolName): number {
    return this.settings.dexes[chainId]?.[protocol]?.liquidityFreshness || this.getDayInMillisecond(365);
  }

  private getDayInMillisecond(days: number): number {
    return days * 1000 * 60 * 60 * 24;
  }
}
