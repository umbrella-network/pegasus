import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {UniswapV3Pool} from '../models/UniswapV3Pool.js';
import {ChainsIds} from '../types/ChainsIds.js';

type SavePoolParams = {
  chainId: string;
  protocol: string;
  token0: string;
  token1: string;
  fee: number;
  address: string;
};

type SaveLiquidityParams = {
  liquidityActive: string;
  liquidityLockedToken0: number;
  liquidityLockedToken1: number;
};

type LiquidityFilterParams = {chainId: ChainsIds; token0: string; token1: string; fee: number; address: string};

@injectable()
export class UniswapV3PoolRepository {
  async savePool(props: SavePoolParams): Promise<UniswapV3Pool> {
    const UniswapV3PoolModel = getModelForClass(UniswapV3Pool);

    const uniswapV3PoolData = new UniswapV3PoolModel({
      ...props,
      createdDate: new Date(Date.now()),
    });

    return uniswapV3PoolData.save();
  }

  async saveLiquidity(filter: LiquidityFilterParams, liquidity: SaveLiquidityParams): Promise<UniswapV3Pool | null> {
    const {token0, token1} = filter;

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

  async find(props: {protocol: string; fromChain: string[]; token0: string; token1: string}): Promise<UniswapV3Pool[]> {
    const {protocol, fromChain, token0, token1} = props;
    const filter = {
      protocol,
      chainId: {$in: fromChain},
      token0: {$in: [token0, token1]},
      token1: {$in: [token0, token1]},
    };

    return getModelForClass(UniswapV3Pool).find(filter).exec();
  }
}
