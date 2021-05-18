import {BigNumber} from 'ethers';

export type LogMint = {
  minter: string;
  blockId: BigNumber;
  staked: BigNumber;
  power: BigNumber;
};

export type LogVoter = {
  blockId: BigNumber;
  voter: string;
  vote: BigNumber;
};
