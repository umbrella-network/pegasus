import {OptionsEntries} from '../services/fetchers/OptionsPriceFetcher.js';
import {FeedFetcher} from './Feed.js';

export type CryptoCompareHistoFetcherResult = [
  {high: number; low: number; open: number; close: number},
  volume: number,
];

export type FetcherResult = {
  prices: (number | undefined)[];
  timestamp?: number;
};

export type CryptoCompareMultiProcessorResult = number | undefined;

export type OnChainDataFetcherResult = string | number;

export type NumberOrUndefined = number | undefined;

export type StringOrUndefined = string | undefined;

// TODO: refactor this type
export type FeedFetcherInterfaceResult =
  | Promise<number | undefined>
  | Promise<OnChainDataFetcherResult>
  | Promise<CryptoCompareHistoFetcherResult[] | undefined>
  | Promise<CryptoCompareMultiProcessorResult[]>
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
  apply(params: any, options: FeedMultiFetcherOptions): FeedFetcherInterfaceResult;
}

export interface FeedMultiProcessorInterface {
  apply(feedFetchers: FeedFetcher[]): Promise<NumberOrUndefined[]>;
}

export enum FetcherName {
  G_VOL_IMPLIED_VOLATILITY = 'GVolImpliedVolatility',
  CRYPTO_COMPARE_PRICE = 'CryptoComparePrice',
  CRYPTO_COMPARE_PRICE_WS = 'CryptoComparePriceWS',
  CRYPTO_COMPARE_HISTO_HOUR = 'CryptoCompareHistoHour',
  CRYPTO_COMPARE_HISTO_DAY = 'CryptoCompareHistoDay',
  COINMARKETCAP_PRICE = 'CoinmarketcapPrice',
  COINMARKETCAP_HISTO_HOUR = 'CoinmarketcapHistoHour',
  COINMARKETCAP_HISTO_DAY = 'CoinmarketcapHistoDay',
  COINGECKO_PRICE = 'CoingeckoPrice',
  POLYGON_IO_PRICE = 'PolygonIOPrice',
  POLYGON_IO_STOCK_PRICE = 'PolygonIOStockPrice',
  POLYGON_IO_STOCK_SNAPSHOT = 'PolygonIOStockSnapshot',
  POLYGON_IO_SINGLE_CRYPTO_PRICE = 'PolygonIOSingleCryptoPrice',
  POLYGON_IO_CRYPTO_PRICE = 'PolygonIOCryptoPrice',
  POLYGON_IO_CURRENCY_SNAPSHOT_GRAMS = 'PolygonIOCurrencySnapshotGrams',
  IEX_ENERGY = 'IEXEnergy',
  BEACPI_AVERAGE = 'BEACPIAverage',
  TWAP_GAS_PRICE = 'TWAPGasPrice',
  ON_CHAIN_DATA = 'OnChainData',
  UNISWAP_V3 = 'UniswapV3Fetcher',
  UNISWAP_PRICE = 'UniswapPriceFetcher',
  GOLD_API_PRICE = 'GoldApiPrice',
  METAL_PRICE_API = 'MetalPriceApi',
  METALS_DEV_API = 'MetalsDevApi',
  OPTIONS_PRICE = 'OptionsPrice',
  YEARN_VAULT_TOKEN_PRICE = 'YearnVaultTokenPrice',
  RANDOM_NUMBER = 'RandomNumber',
  SOVRYN_PRICE = 'SovrynPriceFetcher',
  BY_BIT = 'ByBit',
  BINANCE = 'Binance',
}

export const allMultiFetchers: Set<string> = new Set([
  FetcherName.CRYPTO_COMPARE_PRICE,
  FetcherName.COINGECKO_PRICE,
  FetcherName.UNISWAP_V3,
  FetcherName.SOVRYN_PRICE,
  FetcherName.BY_BIT,
  FetcherName.BINANCE,
]);
