export type ChainSubmitArgs = {
  dataTimestamp: number;
  root: string;
  keys: Buffer[];
  values: Buffer[];
  v: number[];
  r: string[];
  s: string[];
};
