import {Container} from 'inversify';
import Settings from '../types/Settings.js';
import settings from '../config/settings.js';
import {Logger} from 'winston';
import {Redis} from 'ioredis';

import logger from './logger.js';

import PriceRepository from '../repositories/PriceRepository.js';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository.js';
import {CalculatorRepository} from '../repositories/CalculatorRepository.js';
import {FeedRepository} from '../repositories/FeedRepository.js';
import {BlockchainProviderRepository} from '../repositories/BlockchainProviderRepository.js';
import {initRedis} from '../config/initRedis.js';
import {MongoDBPriceRepository} from '../repositories/MongoDBPriceRepository.js';
import FeedProcessor from '../services/FeedProcessor.js';
import {ContractAddressService} from '../services/ContractAddressService.js';
import FetcherAPILimit from '../types/FetcherAPILimit.js';
import fetcherAPILimit from '../config/fetcherAPILimit.js';
import {BinanceDataRepository} from '../repositories/fetchers/BinanceDataRepository.js';
import {ByBitDataRepository} from '../repositories/fetchers/ByBitDataRepository.js';
import {CoingeckoDataRepository} from '../repositories/fetchers/CoingeckoDataRepository.js';
import {TWAPGasRepository} from '../repositories/fetchers/TWAPGasRepository.js';
import {GoldApiDataRepository} from '../repositories/fetchers/GoldApiDataRepository.js';
import {MetalPriceApiDataRepository} from '../repositories/fetchers/MetalPriceApiDataRepository.js';
import {MetalsDevApiDataRepository} from '../repositories/fetchers/MetalsDevApiDataRepository.js';
import {OnChainDataRepository} from '../repositories/fetchers/OnChainDataRepository.js';
import {PolygonIOCryptoSnapshotDataRepository} from '../repositories/fetchers/PolygonIOCryptoSnapshotDataRepository.js';
import {PolygonIOCurrencySnapshotGramsDataRepository} from '../repositories/fetchers/PolygonIOCurrencySnapshotGramsDataRepository.js';
import {PolygonIOSingleCryptoDataRepository} from '../repositories/fetchers/PolygonIOSingleCryptoDataRepository.js';
import {
  BinancePriceGetter,
  ByBitPriceGetter,
  CoingeckoPriceGetter,
  EvmTWAPGasPriceGetter,
  GoldApiPriceGetter,
  MetalPriceApiGetter,
  MetalsDevApiGetter,
  OnChainDataFetcher,
  PolygonIOCryptoSnapshotPriceGetter,
  PolygonIOCurrencySnapshotGramsGetter,
  PolygonIOSingleCryptoPriceGetter,
  PolygonIOStockSnapshotPriceGetter,
  RandomNumberFetcher,
} from '../services/fetchers/index.js';
import {VerifyProposedData} from '../services/tools/VerifyProposedData.js';

import PriceFetchingWorker from '../workers/PriceFetchingWorker.js';
import {PriceFetcherServiceRepository} from '../repositories/PriceFetcherServiceRepository.js';
import BlockMintingWorker from '../workers/BlockMintingWorker.js';
import {SovrynPriceGetter} from '../services/fetchers/SovrynPriceGetter.js';
import {UniswapV3Getter} from '../services/fetchers/UniswapV3Getter.js';
import {BinancePriceService} from '../workers/fetchers/BinancePriceService.js';
import {ByBitPriceService} from '../workers/fetchers/ByBitPriceService.js';
import {CoingeckoPriceService} from '../workers/fetchers/CoingeckoPriceService.js';
import {GoldApiPriceService} from '../workers/fetchers/GoldApiPriceService.js';
import {MetalPriceApiService} from '../workers/fetchers/MetalPriceApiService.js';
import {MetalsDevApiService} from '../workers/fetchers/MetalsDevApiService.js';
import {PolygonIOCryptoSnapshotPriceService} from '../workers/fetchers/PolygonIOCryptoSnapshotPriceService.js';
import {PolygonIOCurrencySnapshotGramsService} from '../workers/fetchers/PolygonIOCurrencySnapshotGramsService.js';
import {PolygonIOSingleCryptoPriceService} from '../workers/fetchers/PolygonIOSingleCryptoPriceService.js';
import {PolygonIOStockSnapshotPriceService} from '../workers/fetchers/PolygonIOStockSnapshotPriceService.js';

export function getContainer(): Container {
  const container = new Container({autoBindInjectable: true});
  container.bind<Settings>('Settings').toConstantValue(settings);
  container.bind<Logger>('Logger').toConstantValue(logger);
  container.bind<FetcherAPILimit>('FetcherAPILimit').toConstantValue(fetcherAPILimit);
  container.bind(PriceRepository).toSelf().inSingletonScope();
  container.bind(FeedFetcherRepository).toSelf().inSingletonScope();
  container.bind(CalculatorRepository).toSelf().inSingletonScope();
  container.bind(FeedRepository).toSelf().inSingletonScope();
  container.bind(VerifyProposedData).toSelf().inSingletonScope();
  container.bind(BlockMintingWorker).toSelf().inSingletonScope();
  container.bind(BlockchainProviderRepository).toSelf().inSingletonScope();
  container.bind(MongoDBPriceRepository).toSelf().inSingletonScope();
  container.bind(FeedProcessor).toSelf().inSingletonScope();
  container.bind(ContractAddressService).toSelf().inSingletonScope();

  container.bind(BinancePriceGetter).toSelf().inSingletonScope();
  container.bind(BinanceDataRepository).toSelf().inSingletonScope();
  container.bind(ByBitPriceGetter).toSelf().inSingletonScope();
  container.bind(ByBitDataRepository).toSelf().inSingletonScope();
  container.bind(CoingeckoDataRepository).toSelf().inSingletonScope();
  container.bind(CoingeckoPriceGetter).toSelf().inSingletonScope();
  container.bind(EvmTWAPGasPriceGetter).toSelf().inSingletonScope();
  container.bind(TWAPGasRepository).toSelf().inSingletonScope();
  container.bind(GoldApiDataRepository).toSelf().inSingletonScope();
  container.bind(GoldApiPriceGetter).toSelf().inSingletonScope();
  container.bind(MetalPriceApiDataRepository).toSelf().inSingletonScope();
  container.bind(MetalPriceApiGetter).toSelf().inSingletonScope();
  container.bind(MetalsDevApiDataRepository).toSelf().inSingletonScope();
  container.bind(MetalsDevApiGetter).toSelf().inSingletonScope();
  container.bind(OnChainDataFetcher).toSelf().inSingletonScope();
  container.bind(OnChainDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOCryptoSnapshotPriceGetter).toSelf().inSingletonScope();
  container.bind(PolygonIOCryptoSnapshotDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOCurrencySnapshotGramsDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOCurrencySnapshotGramsGetter).toSelf().inSingletonScope();
  container.bind(PolygonIOSingleCryptoDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOSingleCryptoPriceGetter).toSelf().inSingletonScope();
  container.bind(PolygonIOStockSnapshotPriceGetter).toSelf().inSingletonScope();
  container.bind(RandomNumberFetcher).toSelf().inSingletonScope();
  container.bind(SovrynPriceGetter).toSelf().inSingletonScope();
  container.bind(UniswapV3Getter).toSelf().inSingletonScope();

  container.bind(PriceFetchingWorker).toSelf().inSingletonScope();
  container.bind(PriceFetcherServiceRepository).toSelf().inSingletonScope();

  container.bind(BinancePriceService).toSelf().inSingletonScope();
  container.bind(ByBitPriceService).toSelf().inSingletonScope();
  container.bind(CoingeckoPriceService).toSelf().inSingletonScope();
  container.bind(GoldApiPriceService).toSelf().inSingletonScope();
  container.bind(MetalPriceApiService).toSelf().inSingletonScope();
  container.bind(MetalsDevApiService).toSelf().inSingletonScope();
  container.bind(PolygonIOCryptoSnapshotPriceService).toSelf().inSingletonScope();
  container.bind(PolygonIOCurrencySnapshotGramsService).toSelf().inSingletonScope();
  container.bind(PolygonIOSingleCryptoPriceService).toSelf().inSingletonScope();
  container.bind(PolygonIOStockSnapshotPriceService).toSelf().inSingletonScope();

  container
    .bind<Redis>('Redis')
    .toDynamicValue((ctx) => initRedis(ctx.container.get('Settings')))
    .inSingletonScope();

  return container;
}
