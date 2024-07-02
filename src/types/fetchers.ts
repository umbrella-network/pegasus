export type FetcherHistoryInterface = {
  fetcher: string;
  symbol: string;
  timestamp: number;
  value: string;
};

export type CryptoCompareHistoFetcherResult = [
  {high: number; low: number; open: number; close: number},
  volume: number,
];

export type SovrynPriceFetcherResult = {
  prices: (number | undefined)[];
  timestamp: number;
};

export type CryptoCompareMultiProcessorResult = number | undefined;

export type StringMultiProcessorResult = string | undefined;

export type OnChainDataFetcherResult = string | number;

export interface FeedBaseQuote {
  feedBase: string;
  feedQuote: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Params = {[key: string]: any} & Required<FeedBaseQuote>;

export interface FeedFetcherInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(params: Params, timestamp?: number): Promise<any>;
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
}
