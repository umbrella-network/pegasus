import {InputParams as InputParamsSovrynPrice} from 'src/services/dexes/sovryn/SovrynPriceFetcher';
import {InputParams as InputParamsBinancePrice} from 'src/services/fetchers/BinancePriceFetcher';
import {InputParams as InputParamsByBitPrice} from 'src/services/fetchers/ByBitPriceFetcher';
import {InputParams as InputParamsCoingeckoPrice} from 'src/services/fetchers/CoingeckoPriceFetcher';
import {InputParams as InputParamsEvmTWAPGasPrice} from 'src/services/fetchers/EvmTWAPGasPriceFetcher';
import {InputParams as InputParamsGoldApiPrice} from 'src/services/fetchers/GoldApiPriceFetcher';
import {InputParams as InputParamsMetalPriceApi} from 'src/services/fetchers/MetalPriceApiFetcher';
import {InputParams as InputParamsMetalsDevApi} from 'src/services/fetchers/MetalsDevApiFetcher';
import {InputParams as InputParamsPolygonIOCryptoPrice} from 'src/services/fetchers/PolygonIOCryptoPriceFetcher';
import {InputParams as InputParamsPolygonIOCurrencySnapshotGrams} from 'src/services/fetchers/PolygonIOCurrencySnapshotGramsFetcher';
import {InputParams as InputParamsPolygonIOStockPrice} from 'src/services/fetchers/PolygonIOStockPriceFetcher';

export type NumberOrUndefined = number | undefined;

export type StringOrUndefined = string | undefined;

export type FeedFetcherOptions = {
  symbols: StringOrUndefined[];
  timestamp?: number;
};

export type FetcherResult = {
  prices: (number | undefined)[];
  timestamp?: number;
};

export type FeedFetcherInputParams =
  | InputParamsByBitPrice[]
  | InputParamsBinancePrice[]
  | InputParamsGoldApiPrice
  | InputParamsPolygonIOCryptoPrice
  | InputParamsPolygonIOStockPrice
  | InputParamsPolygonIOCurrencySnapshotGrams
  | InputParamsEvmTWAPGasPrice
  | InputParamsMetalPriceApi
  | InputParamsMetalsDevApi
  | InputParamsSovrynPrice[]
  | InputParamsCoingeckoPrice[];

export interface FeedFetcherInterface {
  apply(params: FeedFetcherInputParams, options: FeedFetcherOptions): Promise<FetcherResult>;
}

export enum FetcherName {
  GVolImpliedVolatility = 'GVolImpliedVolatility',
  CoingeckoPrice = 'CoingeckoPrice',
  PolygonIOPrice = 'PolygonIOPrice',
  PolygonIOStockPrice = 'PolygonIOStockPrice',
  PolygonIOStockSnapshot = 'PolygonIOStockSnapshot',
  PolygonIOSingleCryptoPrice = 'PolygonIOSingleCryptoPrice',
  PolygonIOCryptoPrice = 'PolygonIOCryptoPrice',
  PolygonIOCurrencySnapshotGrams = 'PolygonIOCurrencySnapshotGrams',
  TWAPGasPrice = 'TWAPGasPrice',
  OnChainData = 'OnChainData',
  UniswapV3 = 'UniswapV3',
  UniswapPrice = 'UniswapPrice',
  GoldApiPrice = 'GoldApiPrice',
  MetalPriceApi = 'MetalPriceApi',
  MetalsDevApi = 'MetalsDevApi',
  OptionsPrice = 'OptionsPrice',
  YearnVaultTokenPrice = 'YearnVaultTokenPrice',
  RandomNumber = 'RandomNumber',
  SovrynPrice = 'SovrynPrice',
  ByBitPrice = 'ByBitPrice',
  BinancePrice = 'BinancePrice',
}

export const allMultiFetchers: Set<string> = new Set([
  FetcherName.CoingeckoPrice,
  FetcherName.UniswapV3,
  FetcherName.SovrynPrice,
  FetcherName.ByBitPrice,
  FetcherName.BinancePrice,
]);
