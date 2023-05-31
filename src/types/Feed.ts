import {ChainsIds} from './ChainsIds';

export interface Feed {
  // deviation feed attributes
  heartbeat?: number;
  trigger?: number;
  interval?: number;
  chains?: ChainsIds[];

  // standard feed attributes
  symbol?: string;
  discrepancy: number;
  precision: number;
  inputs: FeedInput[];
}

export default interface Feeds {
  [leafLabel: string]: Feed;
}

export enum FeedsType {
  CONSENSUS,
  DEVIATION_TRIGGER,
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
  chainId?: ChainsIds; // default ETH
  address: string;
  method: string;
  inputs: string[]; // array of types
  outputs: string[]; // array of types
  args: string[];
  returnIndex?: number; // id/index of on-chain returned data that should be used as returned value
  decimals?: number; // decimals of returned number, if undefined will be returned as string
}
