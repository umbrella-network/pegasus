import {SovrynPriceInputParams} from 'src/services/fetchers/SovrynPriceFetcher';
import {BinancePriceInputParams} from 'src/services/fetchers/BinancePriceFetcher';
import {ByBitPriceInputParams} from 'src/services/fetchers/ByBitPriceFetcher';
import {CoingeckoPriceInputParams} from 'src/services/fetchers/CoingeckoPriceFetcher';
import {EvmTWAPGasPriceInputParams} from 'src/services/fetchers/EvmTWAPGasPriceFetcher';
import {GoldApiPriceInputParams} from 'src/services/fetchers/GoldApiPriceFetcher';
import {MetalPriceApiInputParams} from 'src/services/fetchers/MetalPriceApiFetcher';
import {MetalsDevApiPriceInputParams} from 'src/services/fetchers/MetalsDevApiFetcher';
import {PolygonIOCurrencySnapshotGramsInputParams} from 'src/services/fetchers/PolygonIOCurrencySnapshotGramsFetcher';
import {PolygonIOStockSnapshotFetcherInputParams} from 'src/services/fetchers/PolygonIOStockSnapshotPriceFetcher';
import {PolygonIOCryptoSnapshotInputParams} from '../services/fetchers/PolygonIOCryptoSnapshotPriceFetcher.js';
import {PolygonIOSingleCryptoPriceInputParams} from '../services/fetchers/PolygonIOSingleCryptoPriceFetcher.js';
import {UniswapV3FetcherInputParams} from '../services/fetchers/UniswapV3Fetcher';

export type NumberOrUndefined = number | undefined;

export type StringOrUndefined = string | undefined;

export type FeedFetcherOptions = {
  symbols: StringOrUndefined[];
  timestamp: number;
};

export enum FetchedValueType {
  Price = 'Price',
  Hex = 'Hex',
}

export type FetcherResult = {
  prices: (number | undefined)[];
  timestamp?: number;
};

export type FeedFetcherInputParams =
  | ByBitPriceInputParams
  | BinancePriceInputParams
  | GoldApiPriceInputParams
  | PolygonIOCryptoSnapshotInputParams
  | PolygonIOSingleCryptoPriceInputParams
  | PolygonIOCurrencySnapshotGramsInputParams
  | PolygonIOStockSnapshotFetcherInputParams
  | EvmTWAPGasPriceInputParams
  | MetalPriceApiInputParams
  | MetalsDevApiPriceInputParams
  | SovrynPriceInputParams
  | UniswapV3FetcherInputParams
  | CoingeckoPriceInputParams;

export interface FeedFetcherInterface {
  apply(params: FeedFetcherInputParams[], options: FeedFetcherOptions): Promise<FetcherResult>;
}

export interface ServiceInterface {
  apply(): Promise<void>;
}

export enum FetcherName {
  GVolImpliedVolatility = 'GVolImpliedVolatility',
  CoingeckoPrice = 'CoingeckoPrice',
  PolygonIOStockSnapshotPrice = 'PolygonIOStockSnapshotPrice',
  PolygonIOSingleCryptoPrice = 'PolygonIOSingleCryptoPrice',
  PolygonIOCurrencySnapshotGrams = 'PolygonIOCurrencySnapshotGrams',
  PolygonIOCryptoSnapshotPrice = 'PolygonIOCryptoSnapshotPrice',
  TWAPGasPrice = 'TWAPGasPrice',
  OnChainData = 'OnChainData',
  UniswapV3 = 'UniswapV3',
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
  FetcherName.BinancePrice,
  FetcherName.ByBitPrice,
  FetcherName.CoingeckoPrice,
  FetcherName.PolygonIOCryptoSnapshotPrice,
  FetcherName.PolygonIOStockSnapshotPrice,
  FetcherName.PolygonIOSingleCryptoPrice,
  FetcherName.UniswapV3,
  FetcherName.SovrynPrice,
]);
