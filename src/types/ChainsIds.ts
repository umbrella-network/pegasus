export enum ChainsIds {
  BSC = 'bsc',
  AVALANCHE = 'avax',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  ETH = 'ethereum',
  LINEA = 'linea',
  BASE = 'base',
}

export type ChainsIdsKeys = keyof typeof ChainsIds;

export const NonEvmChainsIds: ChainsIds[] = [];
