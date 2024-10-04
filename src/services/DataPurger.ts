import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import TimeService from './TimeService.js';
import BlockRepository from '../repositories/BlockRepository.js';
import {CoingeckoDataRepository} from '../repositories/fetchers/CoingeckoDataRepository.js';
import {BinanceDataRepository} from '../repositories/fetchers/BinanceDataRepository.js';
import {ByBitDataRepository} from '../repositories/fetchers/ByBitDataRepository.js';
import {GoldApiDataRepository} from '../repositories/fetchers/GoldApiDataRepository.js';
import {MetalPriceApiDataRepository} from '../repositories/fetchers/MetalPriceApiDataRepository.js';
import {MetalsDevApiDataRepository} from '../repositories/fetchers/MetalsDevApiDataRepository.js';
import {MoCMeasurementDataRepository} from '../repositories/fetchers/MoCMeasurementDataRepository.js';
import {OnChainDataRepository} from '../repositories/fetchers/OnChainDataRepository.js';
import {PolygonIOCryptoSnapshotDataRepository} from '../repositories/fetchers/PolygonIOCryptoSnapshotDataRepository.js';
import {PolygonIOCurrencySnapshotGramsDataRepository} from '../repositories/fetchers/PolygonIOCurrencySnapshotGramsDataRepository.js';
import {PolygonIOSingleCryptoDataRepository} from '../repositories/fetchers/PolygonIOSingleCryptoDataRepository.js';
import {PolygonIOStockSnapshotDataRepository} from '../repositories/fetchers/PolygonIOStockSnapshotDataRepository.js';
import {SovrynDataRepository} from '../repositories/fetchers/SovrynDataRepository.js';
import {UniswapV3PriceRepository} from '../repositories/fetchers/UniswapV3PriceRepository.js';

@injectable()
class DataPurger {
  @inject('Logger') protected logger!: Logger;
  @inject(TimeService) timeService!: TimeService;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(BinanceDataRepository) binanceDataRepository!: BinanceDataRepository;
  @inject(ByBitDataRepository) byBitDataRepository!: ByBitDataRepository;
  @inject(CoingeckoDataRepository) coingeckoDataRepository!: CoingeckoDataRepository;
  @inject(GoldApiDataRepository) goldApiDataRepository!: GoldApiDataRepository;
  @inject(MetalPriceApiDataRepository) metalPriceApiDataRepository!: MetalPriceApiDataRepository;
  @inject(MetalsDevApiDataRepository) metalsDevApiDataRepository!: MetalsDevApiDataRepository;
  @inject(MoCMeasurementDataRepository) moCMeasurementDataRepository!: MoCMeasurementDataRepository;
  @inject(OnChainDataRepository) onChainDataRepository!: OnChainDataRepository;
  @inject(PolygonIOCryptoSnapshotDataRepository)
  polygonIOCryptoSnapshotDataRepository!: PolygonIOCryptoSnapshotDataRepository;
  @inject(PolygonIOCurrencySnapshotGramsDataRepository)
  polygonIOCurrencySnapshotGramsDataRepository!: PolygonIOCurrencySnapshotGramsDataRepository;
  @inject(PolygonIOSingleCryptoDataRepository)
  polygonIOSingleCryptoDataRepository!: PolygonIOSingleCryptoDataRepository;
  @inject(PolygonIOStockSnapshotDataRepository)
  polygonIOStockSnapshotDataRepository!: PolygonIOStockSnapshotDataRepository;
  @inject(SovrynDataRepository) sovrynDataRepository!: SovrynDataRepository;
  @inject(UniswapV3PriceRepository) uniswapV3PriceRepository!: UniswapV3PriceRepository;

  private logPrefix = '[DataPurger] ';

  async apply(): Promise<void> {
    this.logger.debug(`${this.logPrefix} started`);

    const tStart = this.timeService.apply();

    const results = await Promise.allSettled([
      this.blockRepository.purge(),
      // this.binanceDataRepository.purge(),
      // this.byBitDataRepository.purge(),
      this.coingeckoDataRepository.purge(),
      // this.goldApiDataRepository.purge(),
      // this.metalPriceApiDataRepository.purge(),
      // this.metalsDevApiDataRepository.purge(),
      // this.moCMeasurementDataRepository.purge(),
      // this.onChainDataRepository.purge(),
      // this.polygonIOCryptoSnapshotDataRepository.purge(),
      // this.polygonIOCurrencySnapshotGramsDataRepository.purge(),
      // this.polygonIOSingleCryptoDataRepository.purge(),
      // this.polygonIOStockSnapshotDataRepository.purge(),
      // this.sovrynDataRepository.purge(),
      // this.uniswapV3PriceRepository.purge(),
    ]);
    let totalDeleted = 0;

    results.forEach((r) => {
      if (r.status == 'rejected') {
        this.logger.error(`${this.logPrefix} error: ${r.reason}`);
      } else {
        totalDeleted += r.value;
      }
    });

    if (totalDeleted != 0) {
      const timeSpend = (await this.timeService.apply()) - tStart;
      this.logger.info(`${this.logPrefix} done, time spend: ${timeSpend}s`);
    } else {
      this.logger.debug(`${this.logPrefix} done.`);
    }
  }
}

export default DataPurger;
