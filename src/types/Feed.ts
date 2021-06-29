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
