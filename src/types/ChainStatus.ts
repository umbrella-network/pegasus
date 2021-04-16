import {BigNumber} from 'ethers';

export interface ChainStatus {
  blockNumber: BigNumber;
  lastDataTimestamp: BigNumber;
  lastBlockHeight: BigNumber;
  nextBlockHeight: BigNumber;
  nextLeader: string;
  validators: string[];
  powers: BigNumber[];
  locations: string[];
  staked: BigNumber;
}
