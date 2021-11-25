import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {UniswapPriceService} from './UniswapPriceService';
import Settings from '../../types/Settings';
import {Provider} from '@ethersproject/providers';
import {UniswapPoolService} from './UniswapPoolService';
import {BlockchainSymbol} from '../../models/BlockchainSymbol';
import {Mutex, MutexInterface, withTimeout} from 'async-mutex';
import {Price, PricesResponse, UniswapV3Helper} from '../../contracts/UniswapV3Helper';
import {BlockchainProviderRepository} from '../../repositories/BlockchainProviderRepository';
import {chunk} from 'lodash';
import {BigNumber} from 'ethers';

export type UniswapPoolPrice = {
  symbol: string;
  value: number;
  timestamp: number;
}

@injectable()
export class UniswapPriceScanner {
  readonly maxLockWaitTime = 100;
  readonly lock: MutexInterface;

  settings: Settings;
  provider: Provider;

  @inject('Logger') logger!: Logger;
  @inject(UniswapPoolService) poolService!: UniswapPoolService;
  @inject(UniswapPriceService) priceService!: UniswapPriceService;
  @inject(UniswapV3Helper) uniswapV3Helper!: UniswapV3Helper;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    this.settings = settings;
    this.provider = <Provider>blockchainProviderRepository.get('ethereum');
    this.lock = withTimeout(new Mutex(), this.maxLockWaitTime);
  }

  async start(): Promise<void> {
    this.log('Starting Price Scanner');
    this.provider.on('block', async (blockNumber) => await this.processBlock(blockNumber))
  }

  private async processBlock(blockNumber: number): Promise<void> {
    this.log(`New block detected: ${blockNumber}.`);

    if (this.lock.isLocked()) {
      this.log(`Skipping block ${blockNumber} - busy.`);
      return;
    }

    await this.lock.runExclusive(async () => {
      try {
        this.log(`Processing block ${blockNumber}...`);
        const verifiedPools = await this.getVerifiedPools();

        if (verifiedPools.length == 0) {
          this.log('No verified pools found, skipping...');
          return;
        }

        this.log(`Found ${verifiedPools.length} verified pools.`);

        for (const batch of chunk(verifiedPools, 50)) {
          const prices = await this.getUpdatedPrices(batch);
          await this.savePrices(prices);
        }
      } catch(e) {
        this.logger.error(`[UniswapPriceScanner] Error retrieving prices, skipping...`);
        this.logger.error('[UniswapPriceScanner]', e);
      }
    });
  }

  private log(msg: string): void {
    this.logger.info(`[UniswapPriceScanner] ${msg}`);
  }

  // TODO: add caching?
  private async getVerifiedPools(): Promise<BlockchainSymbol[]> {
    return await this.poolService.getVerifiedPools();
  }

  private async getUpdatedPrices(pools: BlockchainSymbol[]): Promise<UniswapPoolPrice[]> {
    const qualifyingPools = pools.filter(p => !!p.meta?.fee);

    const contractPriceProps = qualifyingPools.map(p => ({
      tokenA: p.tokens[0].address,
      tokenB: p.tokens[1].address,
      fee: <number>p.meta?.fee
    }));

    this.logger.debug(`[UniswapPriceScanner] Input: ${JSON.stringify(contractPriceProps)}`);
    const contractPrices = await this.uniswapV3Helper.getPrices(contractPriceProps);
    const ts = contractPrices.timestamp;

    const prices = <UniswapPoolPrice[]>qualifyingPools
      .map((pool, i) => this.extractPrice(contractPrices.prices[i], pool, ts))
      .filter(p => !!p);

    this.log(`Got ${prices.length} new prices.`);
    return prices;
  }

  // TODO: currently this is breaking with conversion rates of 1-10E30+ (super large numbers).
  private extractPrice(contractPrice: Price, pool: BlockchainSymbol, ts: BigNumber): UniswapPoolPrice | undefined {
    try {
      const value = contractPrice.price.div('1' + '0'.repeat(18)).toNumber();
      const timestamp = ts.toNumber();
      return { symbol: pool.symbol, value, timestamp };
    } catch (e) {
      this.logger.warn([
          `[UniswapPriceScanner] Cannot convert price for pool ${pool.symbol}`,
          `(${contractPrice.price.toString()}), skipping...`
        ].join(' '));
    }

    return;
  }

  private async savePrices(prices: UniswapPoolPrice[]): Promise<void> {
    await this.priceService.savePrices(prices);
    this.log(`${prices.length} prices saved.`);
  }
}
