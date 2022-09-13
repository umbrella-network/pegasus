export enum ChainsIds {
  BSC = 'bsc',
  POLYGON = 'polygon',
  AVALANCHE = 'avax',
}

export type TChainsIds = ChainsIds.BSC | ChainsIds.POLYGON | ChainsIds.AVALANCHE;

export const NonEvmChainsIds: ChainsIds[] = [];
