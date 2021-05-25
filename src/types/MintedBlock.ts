import {LogMint, LogVoter} from './events';

export type MintedBlock = {
  hash: string;
  anchor: number;
  logMint: LogMint;
  logsVoters: LogVoter[];
};
