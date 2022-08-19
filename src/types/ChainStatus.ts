import {BigNumber} from 'ethers';

export interface ChainStatus {
  blockNumber: BigNumber;
  timePadding: number;
  lastDataTimestamp: number;
  lastBlockId: number;
  nextLeader: string;
  nextBlockId: number;
  validators: string[];
  powers: BigNumber[];
  locations: string[];
  staked: BigNumber;
  minSignatures: number;
}

export interface SolanaChainStatus {
  blockNumber: BigNumber;
  timePadding: number;
  lastDataTimestamp: number;
  lastId: number;
  nextBlockId: number;
}

export interface ChainStatusWithAddress {
  chainId: string;
  chainAddress: string;
  chainStatus: ChainStatus;
}

export interface ChainsStatuses {
  validators: string[];
  nextLeader: string;
  chainsStatuses: ChainStatusWithAddress[];
  chainsIdsReadyForBlock: string[];
}
