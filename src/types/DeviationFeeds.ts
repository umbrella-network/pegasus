import {ChainsId, Feed, FeedName} from './Feed.js';
import Leaf from '../types/Leaf.js';
import {ChainsIds} from './ChainsIds.js';
import {KeyValues} from './SignedBlock.js';
import {Discrepancy} from './Discrepancy.js';
import {DataCollection} from './custom.js';

export interface DeviationFeed extends Feed {
  // deviation feed attributes
  heartbeat: number;
  trigger: number;
  interval: number;
  chains: ChainsIds[];
}

export interface DeviationFeeds {
  [leafLabel: FeedName]: DeviationFeed;
}

export interface DeviationLeavesAndFeeds {
  feeds: DeviationFeeds;
  leaves: Leaf[];
}

export interface Signature {
  v: number;
  r: string;
  s: string;
}

export interface SignatureWithSigner {
  signature: string;
  signer: string;
}

export interface PriceData {
  data: number;
  heartbeat: number;
  timestamp: number;
  price: bigint;
}

export interface PriceDataWithKey extends PriceData {
  key: FeedName;
}

export type PriceDataByKey = DataCollection<PriceDataWithKey>;

export type PriceDataPerChain = DataCollection<PriceDataByKey>;

export type FeedNamesPerChain = Record<ChainsId, FeedName[]>;

export type DeviationSignatures = Record<string, SignatureWithSigner>; // chainId => SignatureWithSigner

export type DeviationTriggerResponse = {
  dataToUpdate?: DeviationDataToSign | undefined;
  reason?: string;
};

export type DeviationDataToSign = {
  dataTimestamp: number;
  leaves: KeyValues; // key/label => value
  feedsForChain: DataCollection<string[]>;
  proposedPriceData: DataCollection<PriceData>; // key => priceData
};

export interface DeviationSignerResponse {
  error?: string;
  signatures?: DeviationSignatures;
  discrepancies: Discrepancy[];
  version: string;
}

export type UmbrellaFeedsUpdateArgs = {
  keys: FeedName[];
  priceDatas: PriceData[];
  signatures: SignatureWithSigner[];
};

export type OnChainMetadataType = [chainId: ChainsIds, networkId: number, contractAddress: string];

export interface FilterResult {
  result: boolean;
  msg?: string;
}

export interface FilterResultWithKey extends FilterResult {
  key: string;
}
