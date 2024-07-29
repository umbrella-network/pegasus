import {OptionsEntries} from '../services/fetchers/OptionsPriceFetcher.js';
import {FeedFetcher} from './Feed.js';

export type FetcherResult = {
  prices: (number | undefined)[];
  timestamp?: number;
};

export type OnChainDataFetcherResult = string | number;

export type NumberOrUndefined = number | undefined;

export type StringOrUndefined = string | undefined;

// TODO: refactor this type
export type FeedFetcherInterfaceResult =
  | Promise<number | undefined>
  | Promise<OnChainDataFetcherResult>
  | Promise<FetcherResult>
  | Promise<NumberOrUndefined>
  | Promise<NumberOrUndefined[]>
  | Promise<OptionsEntries>;

export type FeedFetcherOptions = {
  base: string;
  quote: string;
  timestamp?: number;
};

export interface FeedFetcherInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(params: any, options: FeedFetcherOptions): FeedFetcherInterfaceResult;
}

export type FeedMultiFetcherOptions = {
  symbols: StringOrUndefined[];
};

export interface FeedMultiFetcherInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(params: any, options: FeedMultiFetcherOptions): Promise<FetcherResult>;
}

export interface FeedMultiProcessorInterface {
  apply(feedFetchers: FeedFetcher[]): Promise<NumberOrUndefined[]>;
}

export enum FetcherName {
  GVolImpliedVolatility = 'GVolImpliedVolatility',
  CoinmarketcapPrice = 'CoinmarketcapPrice',
  CoinmarketcapHistoHour = 'CoinmarketcapHistoHour',
  CoinmarketcapHistoDay = 'CoinmarketcapHistoDay',
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
