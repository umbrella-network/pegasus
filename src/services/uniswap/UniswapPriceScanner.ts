import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {chunk} from 'lodash';
import {BigNumber} from 'ethers';
import NodeCache from 'node-cache';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

import {UniswapPriceService} from './UniswapPriceService';
import Settings from '../../types/Settings';
import {UniswapPoolService} from './UniswapPoolService';
import {BlockchainSymbol} from '../../models/BlockchainSymbol';
import {Mutex, MutexInterface, withTimeout} from 'async-mutex';
import {Price, UniswapV3Helper} from '../../contracts/evm/UniswapV3Helper';
import {BlockchainProviderRepository} from '../../repositories/BlockchainProviderRepository';
import {UniswapV2PriceMonitorChecker} from "../uniswapPriceMonitor/UniswapV2PriceMonitorChecker";
import {UniswapV2PriceMonitorSaver} from "../uniswapPriceMonitor/UniswapV2PriceMonitorSaver";

export type UniswapPoolPrice = {
  symbol: string;
  value: number;
  timestamp: number;
  raw?: string;
};

@injectable()
export class UniswapPriceScanner {
  readonly maxLockWaitTime = 100;
  readonly lock: MutexInterface;

  settings: Settings;
  provider: StaticJsonRpcProvider;
  sourceCache: NodeCache;

  @inject('Logger') logger!: Logger;
  @inject(UniswapPoolService) poolService!: UniswapPoolService;
  @inject(UniswapPriceService) priceService!: UniswapPriceService;
  @inject(UniswapV3Helper) uniswapV3Helper!: UniswapV3Helper;
  @inject(UniswapV2PriceMonitorSaver) uniswapV2PriceMonitorSaver!: UniswapV2PriceMonitorSaver;
  @inject(UniswapV2PriceMonitorChecker) uniswapV2PriceMonitorChecker!: UniswapV2PriceMonitorChecker;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    this.settings = settings;
    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get('ethereum');
    this.sourceCache = new NodeCache({stdTTL: 60, checkperiod: 60});
    this.lock = withTimeout(new Mutex(), this.maxLockWaitTime);
  }

  async start(): Promise<void> {
    this.log('Starting Price Scanner');
    this.provider.on('block', async (blockNumber) => await this.processBlock(blockNumber));
  }

  private async processBlock(blockNumber: number): Promise<void> {
    const lastPriceCount = await this.uniswapV2PriceMonitorChecker.apply();

    if (lastPriceCount === 0 && blockNumber % 4 != 0) {
      this.log(`[UniswapPriceScanner] lastPriceCount ${lastPriceCount}, skipping block ${blockNumber}`);
      return;
    }

    this.log(`New block detected: ${blockNumber}, lastPriceCount ${lastPriceCount}`);

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

        let totalPrices = 0;
        for (const batch of chunk(verifiedPools, 100)) {
          const prices = await this.getUpdatedPrices(batch);
          totalPrices += prices.length;
          await this.savePrices(prices);
        }

        await this.uniswapV2PriceMonitorSaver.apply(totalPrices);
      } catch (e) {
        this.logger.error(`[UniswapPriceScanner] Error retrieving prices, skipping...`);
        this.logger.error('[UniswapPriceScanner]', e);
      }
    });
  }

  private log(msg: string): void {
    this.logger.info(`[UniswapPriceScanner] ${msg}`);
  }

  private async getVerifiedPools(): Promise<BlockchainSymbol[]> {
    let verifiedPools = this.sourceCache.get<BlockchainSymbol[]>('VERIFIED_POOLS');
    if (verifiedPools) return verifiedPools;

    verifiedPools = await this.poolService.getVerifiedPools();
    this.sourceCache.set<BlockchainSymbol[]>('VERIFIED_POOLS', verifiedPools);
    return verifiedPools;
  }

  private async getUpdatedPrices(pools: BlockchainSymbol[]): Promise<UniswapPoolPrice[]> {
    const qualifyingPools = pools.filter((p) => !!p.meta?.fee);

    const contractPriceProps = qualifyingPools.map((p) => ({
      tokenA: p.tokens[0].address,
      tokenB: p.tokens[1].address,
      fee: <number>p.meta?.fee,
    }));

    this.logger.debug(`[UniswapPriceScanner] Input: ${JSON.stringify(contractPriceProps)}`);
    const contractPrices = await this.uniswapV3Helper.getPrices(contractPriceProps);
    const ts = contractPrices.timestamp;

    const prices = <UniswapPoolPrice[]>(
      qualifyingPools.map((pool, i) => this.extractPrice(contractPrices.prices[i], pool, ts))
    );

    const validPrices = prices.filter((p) => !!p && p.value != 0);

    this.log(`Got ${validPrices.length} new prices.`);
    return validPrices;
  }

  private extractPrice(contractPrice: Price, pool: BlockchainSymbol, ts: BigNumber): UniswapPoolPrice | undefined {
    if (!contractPrice.success) {
      this.logger.info(`[UniswapPriceScanner] ignored unsuccessful price ${pool.symbol}`);
      return undefined;
    }

    try {
      const digits = 15 - contractPrice.price.div('1' + '0'.repeat(18)).toString().length;
      const n = digits < 0 ? 0 : digits;
      const value = contractPrice.price.div('1' + '0'.repeat(18 - n)).toNumber() / 10 ** n;
      const timestamp = ts.toNumber();
      return {symbol: pool.symbol, value, timestamp};
    } catch (e) {
      return undefined;
    }
  }

  private async savePrices(prices: UniswapPoolPrice[]): Promise<void> {
    this.logger.debug(`[UniswapPriceScanner] Saving prices ${JSON.stringify(prices)}`);
    await this.priceService.savePrices(prices);
    this.log(`${prices.length} prices saved.`);
  }
}
