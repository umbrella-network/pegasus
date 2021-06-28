import Leaf from '../types/Leaf';
import {BigNumber} from 'ethers';
import Feeds from './Feed';

export interface DataForConsensus {
  affidavit: string;
  dataTimestamp: number;
  fcdKeys: string[];
  fcdValues: number[];
  leaves: Leaf[];
  root: string;
}

export interface Consensus {
  dataTimestamp: number;
  leaves: Leaf[];
  root: string;
  fcdKeys: string[];
  fcdValues: number[];
  signatures: string[];
  power: BigNumber;
}

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
