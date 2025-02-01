import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ChainId, Token} from '@uniswap/sdk-core';

import {LiquiditySummingService} from './LiquiditySummingService.js';
import {SaveLiquidityParams, UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {TokenRepository} from '../../../../repositories/TokenRepository.js';
import {UniswapV3Param} from './interfaces.js';
import {DexProtocolName} from '../../../../types/Dexes.js';
import {UniswapV3Pool} from '../../../../models/UniswapV3Pool.js';
import {UniswapV3FeedsGetter} from './UniswapV3FeedsGetter.js';

@injectable()
export class UniswapV3LiquidityResolver {
  @inject(UniswapV3FeedsGetter) uniswapV3FeedsGetter!: UniswapV3FeedsGetter;
  @inject(TokenRepository) tokenRepository!: TokenRepository;
  @inject(LiquiditySummingService) liquiditySummingService!: LiquiditySummingService;
  @inject(UniswapV3PoolRepository) uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject('Logger') logger!: Logger;

  readonly protocol = DexProtocolName.UNISWAP_V3;
  readonly logPrefix = '[UniswapV3LiquidityResolver]';

  async apply(chainId: ChainsIds): Promise<void> {
    const uniswapV3Params = await this.uniswapV3FeedsGetter.apply(chainId);

    if (uniswapV3Params.length === 0) {
      this.logger.info(`${this.logPrefix}[${chainId}] No params for fetcher`);
      return;
    }

    await this.processParams(uniswapV3Params, chainId);
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

    const UniswapV3ChainNumber = this.getUniswapV3ChainNumber(chainId);

    if (!UniswapV3ChainNumber) {
      throw new Error(`${this.logPrefix}[${chainId}] chain number found`);
    }

    return [
      new Token(UniswapV3ChainNumber, tokenA.address, tokenA.decimals, tokenA.symbol, tokenA.name),
      new Token(UniswapV3ChainNumber, tokenB.address, tokenB.decimals, tokenB.symbol, tokenB.name),
    ];
  }

  private async processParams(uniswapV3Params: UniswapV3Param[], chainId: ChainsIds): Promise<void> {
    await Promise.all(
      uniswapV3Params
        .filter((param) => param.fromChain.includes(chainId))
        .map(async (param) => {
          const pools = await this.uniswapV3PoolRepository.find({
            token0: param.base,
            token1: param.quote,
            fromChain: chainId,
            protocol: this.protocol,
          });

          if (pools.length === 0) {
            this.logger.error(`${this.logPrefix}[${chainId}] pool not found for token ${param.quote}-${param.base}`);
            return;
          }

          const [token0, token1] = await this.getTokens(param.quote, param.base, chainId);

          await Promise.all(
            pools.map(async (pool) => {
              const liquidity = await this.getLiquidities(pool, token0, token1, chainId);
              if (liquidity) await this.saveLiquidities(pool, token0, token1, chainId, liquidity);
            }),
          );
        }),
    );
  }

  private async getLiquidities(
    pool: UniswapV3Pool,
    token0: Token,
    token1: Token,
    chainId: ChainsIds,
  ): Promise<SaveLiquidityParams | undefined> {
    const liquidity = await this.liquiditySummingService.apply(pool.address, token0, token1, pool.fee, chainId);
    return liquidity;
  }

  private async saveLiquidities(
    pool: UniswapV3Pool,
    token0: Token,
    token1: Token,
    chainId: ChainsIds,
    liquidity: SaveLiquidityParams,
  ): Promise<void> {
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

  private getUniswapV3ChainNumber(chainId: ChainsIds): number | undefined {
    const uniswapV3ChainNumbers: Partial<Record<ChainsIds, number>> = {
      [ChainsIds.ETH]: ChainId.MAINNET,
      [ChainsIds.POLYGON]: ChainId.POLYGON,
      [ChainsIds.AVALANCHE]: ChainId.AVALANCHE,
      [ChainsIds.BASE]: ChainId.BASE,
      [ChainsIds.ROOTSTOCK]: ChainId.ROOTSTOCK,
    };

    return uniswapV3ChainNumbers[chainId];
  }
}
