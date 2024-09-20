import {BigNumber} from 'ethers';
import {Validator} from './Validator.js';

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

export interface ChainStatusWithAddress {
  chainId: string;
  chainAddress: string;
  chainStatus: ChainStatus;
}

export interface ChainsStatuses {
  validators: Validator[];
  nextLeader: Validator;
  chainsStatuses: ChainStatusWithAddress[];
  chainsIdsReadyForBlock: string[];
}
