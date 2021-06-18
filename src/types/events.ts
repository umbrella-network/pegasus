import {BigNumber} from 'ethers';

export type LogMint = {
  minter: string;
  blockId: BigNumber;
  staked: BigNumber;
  power: BigNumber;
};
