export enum DexProtocolName {
  UNISWAP_V3 = 'uniswapV3',
  SOVRYN = 'sovryn',
}

export type DexAPISettings = {
  subgraphUrl: string;
  liquidityFreshness: number;
};

export type DexProtocolNameKeys = keyof typeof DexProtocolName;
