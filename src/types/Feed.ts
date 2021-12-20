export interface Feed {
  symbol?: string;
  discrepancy: number;
  precision: number;
  inputs: FeedInput[];
}

export default interface Feeds {
  [leafLabel: string]: Feed;
  // eslint-disable-next-line
}

export type HexStringWith0x = string;

export type FeedValue = number | HexStringWith0x;

export interface FeedFetcher {
  name: string;
  params?: unknown;
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

export interface OnChainCall {
  address: string;
  method: string;
  inputs: string[];
  outputs: string[];
  args: string[];
}
