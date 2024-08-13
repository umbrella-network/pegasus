import {ChainsIds} from './ChainsIds.js';
import {FeedFetcherInputParams, FetcherName} from './fetchers.js';

export type HashedKey = string;
export type FeedName = string;
export type ChainsId = string;

export interface Feed {
  // deviation feed attributes
  heartbeat?: number;
  trigger?: number;
  interval?: number;
  chains?: ChainsIds[];

  // standard feed attributes
  symbol?: string;
  base?: string;
  quote?: string;
  discrepancy: number;
  precision: number;
  inputs: FeedInput[];
}

export default interface Feeds {
  [leafLabel: string]: Feed;
} // eslint-disable-line semi

export enum FeedsType {
  CONSENSUS,
  DEVIATION_TRIGGER,
}

export type HexStringWith0x = string;

export type FeedValue = number | HexStringWith0x;

export interface FeedFetcher {
  name: FetcherName;
  symbol?: string;
  base?: string;
  quote?: string;
  params: FeedFetcherInputParams;
}

export interface FeedCalculator {
  name: string;
  params?: unknown;
}

export interface FeedInput {
  fetcher: FeedFetcher;
  calculator?: FeedCalculator;
}

export interface FeedOutput {
  key: string;
  value: number | string;
}

export interface Pair {
  fsym: string;
  tsym: string;
}

export interface PairWithFreshness extends Pair {
  freshness: number;
}
