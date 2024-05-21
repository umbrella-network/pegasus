import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {Token, ChainId} from '@uniswap/sdk-core';

import TimeService from '../../TimeService.js';
import {FeedsType} from '../../../types/Feed.js';
import {FeedDataService} from '../../FeedDataService.js';
import {LiquiditySummingService} from './LiquiditySummingService.js';
import {LeavesAndFeeds} from '../../../types/Consensus.js';
import {UniswapV3PoolRepository} from '../../../repositories/UniswapV3PoolRepository.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {TokenRepository} from '../../../repositories/TokenRepository.js';
import {UniswapV3Param} from './interfaces.js';
import {DexProtocolName} from '../../../types/Dexes.js';
import {UniswapV3Pool} from '../../../models/UniswapV3Pool.js';
import {FetcherName} from '../../../types/fetchers.js';
import {DeviationLeavesAndFeeds} from 'src/types/DeviationFeeds.js';

@injectable()
export class UniswapV3LiquidityResolver {
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(TimeService) timeService!: TimeService;
  @inject(TokenRepository) tokenRepository!: TokenRepository;
  @inject(LiquiditySummingService) liquiditySummingService!: LiquiditySummingService;
  @inject(UniswapV3PoolRepository) uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject('Logger') logger!: Logger;

  readonly protocol = DexProtocolName.UNISWAP_V3;
  readonly logPrefix = '[UniswapV3LiquidityResolver]';

  async apply(chainId: ChainsIds) {
    const feeds = await this.getFeeds(chainId);
    const uniswapV3Params = this.feedDataService.getParamsByFetcherName<UniswapV3Param>(feeds, FetcherName.UNISWAP_V3);

    if (uniswapV3Params.length === 0) {
      this.logger.info(`${this.logPrefix}[${chainId}] No params for fetcher`);
      return;
    }

    await this.processParams(uniswapV3Params, chainId);
  }

  private async getFeeds(chainId: ChainsIds): Promise<DeviationLeavesAndFeeds> {
    const dataTimestamp = this.timeService.apply();
    const data = await this.feedDataService.apply(dataTimestamp, FeedsType.DEVIATION_TRIGGER);

    if (data.rejected) {
      this.logger.info(`${this.logPrefix}[${chainId}] rejected: ${data.rejected}`);
    }

    return data.feeds as DeviationLeavesAndFeeds;
  }

  private async getTokens(token0: string, token1: string, chainId: ChainsIds): Promise<Token[]> {
    const [tokenA, tokenB] = await Promise.all([
      this.tokenRepository.findOne({chainId, address: token0}),
      this.tokenRepository.findOne({chainId, address: token1}),
    ]);

    if (!tokenA) {
      throw new Error(`${this.logPrefix}[${chainId}] token0: ${token0} not found`);
    }

    if (!tokenB) {
      throw new Error(`${this.logPrefix}[${chainId}] token1: ${token1} not found`);
    }

    }

    return [
      new Token(ChainId.MAINNET, tokenA.address, tokenA.decimals, tokenA.symbol, tokenA.name),
      new Token(ChainId.MAINNET, tokenB.address, tokenB.decimals, tokenB.symbol, tokenB.name),
    ];
  }

  private async processParams(uniswapV3Params: UniswapV3Param[], chainId: ChainsIds) {
    await Promise.all(
      uniswapV3Params
        .filter((param) => param.fromChain.includes(chainId))
        .map(async (param) => {
        const pools = await this.uniswapV3PoolRepository.find({
          token0: param.token0,
          token1: param.token1,
          fromChain: [chainId],
          protocol: this.protocol,
        });

        if (pools.length === 0) {
            this.logger.error(`${this.logPrefix}[${chainId}] pool not found for token ${param.token0}-${param.token1}`);
          return;
        }

        const [token0, token1] = await this.getTokens(param.token0, param.token1, chainId);

        await Promise.all(
          pools.map(async (pool) => {
            const liquidity = await this.getLiquidities(pool, token0, token1, chainId);
            if (liquidity) await this.saveLiquidities(pool, token0, token1, chainId, liquidity);
          }),
        );
      }),
    );
  }

  private async getLiquidities(pool: UniswapV3Pool, token0: Token, token1: Token, chainId: ChainsIds) {
    const liquidity = await this.liquiditySummingService.apply(pool.address, token0, token1, pool.fee, chainId);
    return liquidity;
  }

  private async saveLiquidities(
    pool: UniswapV3Pool,
    token0: Token,
    token1: Token,
    chainId: ChainsIds,
    liquidity: {
      liquidityActive: string;
      liquidityLockedToken0: number;
      liquidityLockedToken1: number;
    },
  ) {
    const save = await this.uniswapV3PoolRepository.saveLiquidity(
      {
        address: pool.address,
        chainId,
        token0: token0.address,
        token1: token1.address,
        fee: pool.fee,
      },
      liquidity,
    );

    if (!save) {
      this.logger.error(`${this.logPrefix}[${chainId}] Update liquidity failed`);
    }

    if (save) {
      this.logger.info(
        // eslint-disable-next-line max-len
        `${this.logPrefix}[${chainId}] data saved for pool address: ${pool.address}, token0: ${token0.address}, token1: ${token1.address}`,
      );
    }
  }
}
