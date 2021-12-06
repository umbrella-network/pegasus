import {HexStringWith0x} from './Feed';

export interface KeyValues {
  [key: string]: HexStringWith0x;
}

export interface SignedBlock {
  dataTimestamp: number;
  fcd: KeyValues;
  leaves: KeyValues;
  signature: string;
}
