import {BigNumber} from 'ethers';

export type LogMint = {
  minter: string;
  blockId: BigNumber;
  staked: BigNumber;
  power: BigNumber;
};

export type LogRegistered = {
  destination: string;
  bytes32: string;
  anchor: number;
};
