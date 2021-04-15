export interface KeyValues {
  [key: string]: number;
}

export interface SignedBlock {
  fcd: KeyValues;
  leaves: KeyValues;
  blockHeight: number;
  signature: string;
  dataTimestamp: number;
}
