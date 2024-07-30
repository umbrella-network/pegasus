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

export interface FeedFetcherInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(params: any, options: FeedFetcherOptions): Promise<FetcherResult>;
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
