import {SovrynPriceInputParams} from 'src/services/dexes/sovryn/SovrynPriceFetcher';
import {BinancePriceInputParams} from 'src/services/fetchers/BinancePriceFetcher';
import {ByBitPriceInputParams} from 'src/services/fetchers/ByBitPriceFetcher';
import {CoingeckoPriceInputParams} from 'src/services/fetchers/CoingeckoPriceFetcher';
import {EvmTWAPGasPriceInputParams} from 'src/services/fetchers/EvmTWAPGasPriceFetcher';
import {GoldApiPriceInputParams} from 'src/services/fetchers/GoldApiPriceFetcher';
import {MetalPriceApiInputParams} from 'src/services/fetchers/MetalPriceApiFetcher';
import {MetalsDevApiPriceInputParams} from 'src/services/fetchers/MetalsDevApiFetcher';
import {PolygonIOCryptoPriceInputParams} from 'src/services/fetchers/PolygonIOCryptoPriceFetcher';
import {PolygonIOCurrencySnapshotGramsInputParams} from 'src/services/fetchers/PolygonIOCurrencySnapshotGramsFetcher';
import {PolygonIOPriceInputParams} from 'src/services/fetchers/PolygonIOStockPriceFetcher';

export type NumberOrUndefined = number | undefined;

export type StringOrUndefined = string | undefined;

export type FeedFetcherOptions = {
  symbols: StringOrUndefined[];
  timestamp?: number;
};

export enum PriceValueType {
  Price = 'Price',
}

export type FetcherResult = {
  prices: (number | undefined)[];
  timestamp?: number;
};

export type FeedFetcherInputParams =
  | ByBitPriceInputParams[]
  | BinancePriceInputParams[]
  | GoldApiPriceInputParams
  | PolygonIOCryptoPriceInputParams
  | PolygonIOCurrencySnapshotGramsInputParams
  | PolygonIOPriceInputParams
  | EvmTWAPGasPriceInputParams
  | MetalPriceApiInputParams
  | MetalsDevApiPriceInputParams
  | SovrynPriceInputParams[]
  | CoingeckoPriceInputParams[];

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
  UniswapV3OLD = 'UniswapV3Fetcher',
  GoldApiPrice = 'GoldApiPrice',
  MetalPriceApi = 'MetalPriceApi',
  MetalsDevApi = 'MetalsDevApi',
  OptionsPrice = 'OptionsPrice',
  YearnVaultTokenPrice = 'YearnVaultTokenPrice',
  RandomNumber = 'RandomNumber',
  SovrynPrice = 'SovrynPrice',
  SovrynPriceOLD = 'SovrynPriceFetcher',
  ByBitPrice = 'ByBitPrice',
  BinancePrice = 'BinancePrice',
}

export const allMultiFetchers: Set<string> = new Set([
  FetcherName.CoingeckoPrice,
  FetcherName.UniswapV3,
  FetcherName.UniswapV3OLD,
  FetcherName.SovrynPrice,
  FetcherName.SovrynPriceOLD,
  FetcherName.ByBitPrice,
  FetcherName.BinancePrice,
]);
