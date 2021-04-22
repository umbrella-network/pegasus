export interface KeyValues {
  [key: string]: number;
}

export interface SignedBlock {
  blockHeight: number;
  dataTimestamp: number;
  fcd: KeyValues;
  leaves: KeyValues;
  signature: string;
}
