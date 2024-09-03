import {Container} from 'inversify';
import Settings from '../types/Settings.js';
import settings from '../config/settings.js';
import {Logger} from 'winston';
import logger from './logger.js';
import {Redis} from 'ioredis';

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
} from '../services/fetchers/index.js';
import {VerifyProposedData} from '../services/tools/VerifyProposedData.js';

export function getContainer(): Container {
  const container = new Container({autoBindInjectable: true});
  container.bind<Settings>('Settings').toConstantValue(settings);
  container.bind<Logger>('Logger').toConstantValue(logger);
  container.bind<FetcherAPILimit>('FetcherAPILimit').toConstantValue(fetcherAPILimit);
  container.bind(PriceRepository).toSelf().inSingletonScope();
  container.bind(FeedFetcherRepository).toSelf().inSingletonScope();
  container.bind(CalculatorRepository).toSelf().inSingletonScope();
  container.bind(FeedRepository).toSelf().inSingletonScope();
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
  container.bind(VerifyProposedData).toSelf().inSingletonScope();

  container
    .bind<Redis>('Redis')
    .toDynamicValue((ctx) => initRedis(ctx.container.get('Settings')))
    .inSingletonScope();

  return container;
}
