import {FeedValue} from '@umb-network/toolbox/dist/types/Feed';

export interface KeyValues {
  [key: string]: FeedValue;
}

export interface SignedBlock {
  dataTimestamp: number;
  fcd: KeyValues;
  leaves: KeyValues;
  signature: string;
}
