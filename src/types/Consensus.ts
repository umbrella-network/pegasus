import {BigNumber} from 'ethers';
import Feeds, {FeedValue} from '../types/Feed';
import Leaf from '../types/Leaf';

export interface DataForConsensus {
  affidavit: string;
  dataTimestamp: number;
  fcdKeys: string[];
  fcdValues: FeedValue[];
  leaves: Leaf[];
  root: string;
}

export enum ConsensusStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export type Consensus = {
  dataTimestamp: number;
  leaves: Leaf[];
  root: string;
  fcdKeys: string[];
  fcdValues: FeedValue[];
  signatures: string[];
  power: BigNumber;
  status: ConsensusStatus;
};

export interface SignedBlockConsensus {
  dataTimestamp: number;
  leaves: Leaf[];
  root: string;
  fcdKeys: string[];
}

export interface ProposedConsensus {
  dataTimestamp: number;
  fcds: Leaf[];
  root: string;
  signer: string;
  fcdKeys: string[];
  leaves: Leaf[];
  affidavit: string;
}

export interface LeavesAndFeeds {
  firstClassLeaves: Leaf[];
  leaves: Leaf[];
  fcdsFeeds: Feeds;
  leavesFeeds: Feeds;
}
