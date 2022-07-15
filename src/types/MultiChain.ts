import {ChainStatus} from './ChainStatus';

export interface ChainStatusWithAddress {
  chainId: string;
  chainAddress: string;
  chainStatus: ChainStatus;
}

export interface ChainsStatuses {
  validators: string[];
  nextLeader: string | undefined;
  chainsStatuses: ChainStatusWithAddress[];
  chainsIdsReadyForBlock: string[];
}
