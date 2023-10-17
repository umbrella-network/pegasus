export interface DeviationSignerInterface {
  apply(dataHash: string): Promise<string>;
}
