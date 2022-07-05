import {ChainStatus} from './ChainStatus';
import {Validator} from './Validator';

export interface ChainStatusResolved {
  chainId: string;
  chainAddress: string;
  chainStatus: ChainStatus;
}

export interface IResolveStatus {
  isAnySuccess: boolean;
  validators: Validator[] | undefined;
  nextLeader: string | undefined;
  resolved: ChainStatusResolved[];
}
