import {ChainsIds} from './ChainsIds.js';

export interface BlockchainGas {
  chainId: ChainsIds;
  blockNumber: number;
  blockTimestamp: number;
  gas: bigint;
}
