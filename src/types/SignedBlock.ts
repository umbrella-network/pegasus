export interface KeyValues {
  [key: string]: number;
}

export interface SignedBlock {
  dataTimestamp: number;
  fcd: KeyValues;
  leaves: KeyValues;
  signature: string;
}
