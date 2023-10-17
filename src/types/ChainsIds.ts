export enum ChainsIds {
  BSC = 'bsc',
  AVALANCHE = 'avax',
  POLYGON = 'polygon',
  ARBITRUM = 'arbitrum',
  ETH = 'ethereum',
  LINEA = 'linea',
  BASE = 'base',
  MULTIVERSX = 'multiversx',
  MASSA = 'massa',
  CONCORDIUM = 'concordium',
}

export type ChainsIdsKeys = keyof typeof ChainsIds;

export const NonEvmChainsIds: ChainsIds[] = [ChainsIds.MULTIVERSX, ChainsIds.CONCORDIUM, ChainsIds.MASSA];
