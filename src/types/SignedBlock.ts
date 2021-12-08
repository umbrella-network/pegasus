import {FeedValue} from './Feed';

export interface KeyValues {
  [key: string]: FeedValue;
}

export interface SignedBlock {
  dataTimestamp: number;
  fcd: KeyValues;
  leaves: KeyValues;
  signature: string;
}
