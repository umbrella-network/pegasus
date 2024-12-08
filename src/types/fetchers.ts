import {SovrynPriceInputParams} from '../services/fetchers/SovrynPriceGetter.js';
import {BinancePriceInputParams} from '../services/fetchers/BinancePriceGetter.js';
import {ByBitPriceInputParams} from '../services/fetchers/ByBitPriceGetter.js';
import {CoingeckoPriceInputParams} from '../services/fetchers/CoingeckoPriceGetter.js';
import {EvmTWAPGasPriceInputParams} from '../services/fetchers/EvmTWAPGasPriceGetter.js';
import {GoldApiPriceInputParams} from '../services/fetchers/GoldApiPriceGetter.js';
import {MetalPriceApiInputParams} from '../services/fetchers/MetalPriceApiGetter.js';
import {MetalsDevApiPriceInputParams} from '../services/fetchers/MetalsDevApiGetter.js';
import {PolygonIOCurrencySnapshotGramsInputParams} from '../services/fetchers/PolygonIOCurrencySnapshotGramsGetter.js';
import {PolygonIOStockSnapshotFetcherInputParams} from '../services/fetchers/PolygonIOStockSnapshotPriceGetter.js';
import {PolygonIOCryptoSnapshotInputParams} from '../services/fetchers/PolygonIOCryptoSnapshotPriceGetter.js';
import {PolygonIOSingleCryptoPriceInputParams} from '../services/fetchers/PolygonIOSingleCryptoPriceGetter.js';
import {UniswapV3FetcherInputParams} from '../services/fetchers/UniswapV3Getter.js';
import {MoCMeasurementPriceInputParams} from '../services/fetchers/MoCMeasurementGetter';

export type StringOrUndefined = string | undefined;

export type FeedFetcherOptions = {
  symbols: StringOrUndefined[];
  timestamp: number;
};

export enum FetchedValueType {
  Number = 'Number',
  Price = 'Price',
  Hex = 'Hex',
}

export type FeedPrice = {
  value: number | undefined;
  vwapVolume?: number;
};

export type FetcherResult = {
  prices: FeedPrice[];
  timestamp?: number;
};

export type FeedFetcherInputParams =
  | ByBitPriceInputParams
  | BinancePriceInputParams
  | CoingeckoPriceInputParams
  | EvmTWAPGasPriceInputParams
  | GoldApiPriceInputParams
  | MetalPriceApiInputParams
  | MoCMeasurementPriceInputParams
  | MetalsDevApiPriceInputParams
  | PolygonIOCryptoSnapshotInputParams
  | PolygonIOCurrencySnapshotGramsInputParams
  | PolygonIOSingleCryptoPriceInputParams
  | PolygonIOStockSnapshotFetcherInputParams
  | SovrynPriceInputParams
  | UniswapV3FetcherInputParams;

export interface FeedFetcherInterface {
  apply(params: FeedFetcherInputParams[], options: FeedFetcherOptions): Promise<FetcherResult>;
}

export interface ServiceInterface {
  apply(): Promise<void>;
}

export enum FetcherName {
  ByBitPrice = 'ByBitPrice',
  BinancePrice = 'BinancePrice',
  BinanceCandlestick = 'BinanceCandlestick',
  CoingeckoPrice = 'CoingeckoPrice',
  GoldApiPrice = 'GoldApiPrice',
  GVolImpliedVolatility = 'GVolImpliedVolatility',
  MetalPriceApi = 'MetalPriceApi',
  MetalsDevApi = 'MetalsDevApi',
  MoCMeasurement = 'MoCMeasurement',
  PolygonIOStockSnapshotPrice = 'PolygonIOStockSnapshotPrice',
  PolygonIOSingleCryptoPrice = 'PolygonIOSingleCryptoPrice',
  PolygonIOCurrencySnapshotGrams = 'PolygonIOCurrencySnapshotGrams',
  PolygonIOCryptoSnapshotPrice = 'PolygonIOCryptoSnapshotPrice',
  OnChainData = 'OnChainData',
  OptionsPrice = 'OptionsPrice',
  RandomNumber = 'RandomNumber',
  SovrynPrice = 'SovrynPrice',
  TWAPGasPrice = 'TWAPGasPrice',
  UniswapV3 = 'UniswapV3',
  YearnVaultTokenPrice = 'YearnVaultTokenPrice',
}

export const allMultiFetchers: Set<string> = new Set([
  FetcherName.BinancePrice,
  FetcherName.ByBitPrice,
  FetcherName.CoingeckoPrice,
  FetcherName.MoCMeasurement,
  FetcherName.PolygonIOCryptoSnapshotPrice,
  FetcherName.PolygonIOStockSnapshotPrice,
  FetcherName.PolygonIOSingleCryptoPrice,
  FetcherName.UniswapV3,
  FetcherName.SovrynPrice,
]);
