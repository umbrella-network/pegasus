import {OptionsEntries} from '../services/fetchers/OptionsPriceFetcher.js';

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

export type CryptoCompareMultiProcessorResult = number | undefined;

export type OnChainDataFetcherResult = string | number;

export type FeedFetcherInterfaceResult =
  | Promise<number | undefined>
  | Promise<OnChainDataFetcherResult>
  | Promise<CryptoCompareHistoFetcherResult[] | undefined>
  | Promise<CryptoCompareMultiProcessorResult[]>
  | Promise<OptionsEntries>;

export interface FeedFetcherInterface {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(params: any, timestamp?: number): FeedFetcherInterfaceResult;
}
