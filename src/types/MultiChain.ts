import {ChainStatus} from './ChainStatus';

export interface ChainStatusWithAddress {
  chainId: string;
  chainAddress: string;
  chainStatus: ChainStatus;
}

export interface MultiChainStatuses {
  validators: string[];
  nextLeader: string;
  chainsStatuses: ChainStatusWithAddress[];
  chainsIdsReadyForBlock: string[];
}
