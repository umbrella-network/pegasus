import {ChainsIds} from './ChainsIds';

export interface BlockchainGas {
  chainId: ChainsIds;
  blockNumber: number;
  blockTimestamp: number;
  gas: bigint;
}
