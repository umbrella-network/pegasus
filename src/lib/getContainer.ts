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
  BinancePriceFetcher,
  ByBitPriceFetcher,
  CoingeckoPriceFetcher,
  EvmTWAPGasPriceFetcher,
  GoldApiPriceFetcher,
  MetalPriceApiFetcher,
  MetalsDevApiFetcher,
  OnChainDataFetcher,
  PolygonIOCryptoSnapshotPriceFetcher,
  PolygonIOCurrencySnapshotGramsFetcher,
  PolygonIOSingleCryptoPriceFetcher,
  PolygonIOStockSnapshotPriceFetcher, RandomNumberFetcher,
} from '../services/fetchers/index.js';
import {VerifyProposedData} from '../services/tools/VerifyProposedData.js';

import PriceFetchingWorker from '../workers/PriceFetchingWorker.js';
import {PriceFetcherServiceRepository} from '../repositories/PriceFetcherServiceRepository.js';
import BlockMintingWorker from '../workers/BlockMintingWorker.js';
import {SovrynPriceFetcher} from "../services/fetchers/SovrynPriceFetcher";
import {UniswapV3Fetcher} from "../services/fetchers/UniswapV3Fetcher";
import {BinancePriceService} from "../workers/fetchers/BinancePriceService";
import {ByBitPriceService} from "../workers/fetchers/ByBitPriceService";
import {CoingeckoPriceService} from "../workers/fetchers/CoingeckoPriceService";
import {GoldApiPriceService} from "../workers/fetchers/GoldApiPriceService";
import {MetalPriceApiService} from "../workers/fetchers/MetalPriceApiService";
import {MetalsDevApiService} from "../workers/fetchers/MetalsDevApiService";
import {PolygonIOCryptoSnapshotPriceService} from "../workers/fetchers/PolygonIOCryptoSnapshotPriceService";
import {PolygonIOCurrencySnapshotGramsService} from "../workers/fetchers/PolygonIOCurrencySnapshotGramsService";
import {PolygonIOSingleCryptoPriceService} from "../workers/fetchers/PolygonIOSingleCryptoPriceService";
import {PolygonIOStockSnapshotPriceService} from "../workers/fetchers/PolygonIOStockSnapshotPriceService";

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

  container.bind(BinancePriceFetcher).toSelf().inSingletonScope();
  container.bind(BinanceDataRepository).toSelf().inSingletonScope();
  container.bind(ByBitPriceFetcher).toSelf().inSingletonScope();
  container.bind(ByBitDataRepository).toSelf().inSingletonScope();
  container.bind(CoingeckoDataRepository).toSelf().inSingletonScope();
  container.bind(CoingeckoPriceFetcher).toSelf().inSingletonScope();
  container.bind(EvmTWAPGasPriceFetcher).toSelf().inSingletonScope();
  container.bind(TWAPGasRepository).toSelf().inSingletonScope();
  container.bind(GoldApiDataRepository).toSelf().inSingletonScope();
  container.bind(GoldApiPriceFetcher).toSelf().inSingletonScope();
  container.bind(MetalPriceApiDataRepository).toSelf().inSingletonScope();
  container.bind(MetalPriceApiFetcher).toSelf().inSingletonScope();
  container.bind(MetalsDevApiDataRepository).toSelf().inSingletonScope();
  container.bind(MetalsDevApiFetcher).toSelf().inSingletonScope();
  container.bind(OnChainDataFetcher).toSelf().inSingletonScope();
  container.bind(OnChainDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOCryptoSnapshotPriceFetcher).toSelf().inSingletonScope();
  container.bind(PolygonIOCryptoSnapshotDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOCurrencySnapshotGramsDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOCurrencySnapshotGramsFetcher).toSelf().inSingletonScope();
  container.bind(PolygonIOSingleCryptoDataRepository).toSelf().inSingletonScope();
  container.bind(PolygonIOSingleCryptoPriceFetcher).toSelf().inSingletonScope();
  container.bind(PolygonIOStockSnapshotPriceFetcher).toSelf().inSingletonScope();
  container.bind(RandomNumberFetcher).toSelf().inSingletonScope();
  container.bind(SovrynPriceFetcher).toSelf().inSingletonScope();
  container.bind(UniswapV3Fetcher).toSelf().inSingletonScope();

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
