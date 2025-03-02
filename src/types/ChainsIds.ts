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
  AVAX_MELD = 'avax_meld',
  XDC = 'xdc',
  OKX = 'okx',
  ARTHERA = 'arthera',
  ASTAR = 'astar',
  ROOTSTOCK = 'rootstock',
  ZK_LINK_NOVA = 'zk_link_nova',
  BOB = 'bob',
  _5IRE = '_5ire',
}

export type ChainsIdsKeys = keyof typeof ChainsIds;

export const NonEvmChainsIds: ChainsIds[] = [ChainsIds.MULTIVERSX, ChainsIds.CONCORDIUM, ChainsIds.MASSA];
