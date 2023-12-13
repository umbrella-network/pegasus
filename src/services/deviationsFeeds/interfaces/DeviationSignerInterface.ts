export interface DeviationSignerInterface {
  apply(dataHash: string): Promise<string>;
  address(): Promise<string>;
}
