export interface FeedFetcher {
  name: string;
  params?: Map<string, string | number>;
}

export interface MultiFeedFetcher {
  name: string;
  params: {
    fsym: (string | number)[],
    tsyms: (string | number)[]
  };
}

export interface FeedCalculator {
  name: string;
  params?: Map<string, string | number>;
}

export interface FeedInput {
  fetcher: FeedFetcher | MultiFeedFetcher;
  calculator: FeedCalculator;
}

export interface Feed {
  discrepancy: number;
  precision: number;
  inputs: FeedInput[];
}

export default interface Feeds {
  [leafLabel: string]: Feed;
}

export interface Pair {
  fsym: string;
  tsym: string;
}
