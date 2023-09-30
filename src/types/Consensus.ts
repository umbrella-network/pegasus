import {BigNumber} from 'ethers';

import Feeds, {HexStringWith0x} from '../types/Feed';
import Leaf from '../types/Leaf';

export enum ConsensusStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface DataForConsensus {
  affidavit: string;
  dataTimestamp: number;
  fcdKeys: string[];
  fcdValues: HexStringWith0x[];
  leaves: Leaf[];
  root: string;
}

export interface Consensus {
  dataTimestamp: number;
  leaves: Leaf[];
  root: string;
  fcdKeys: string[];
  fcdValues: HexStringWith0x[];
  signatures: string[];
  power: BigNumber;
  status: ConsensusStatus;
}

export type ConsensusDataProps = {
  root: string;
  chainIds: string[];
  signatures: string[];
  fcdKeys: string[];
  fcdValues: HexStringWith0x[];
  leaves: Leaf[];
  dataTimestamp: number;
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

export interface MasterChainData {
  minSignatures: number;
}

export type ExecutedTx = {hash: string; atBlock: bigint};

export type TxHash = string;
