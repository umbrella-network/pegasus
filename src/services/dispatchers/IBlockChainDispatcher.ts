import {ChainStatus} from '../../types/ChainStatus';

export interface IBlockChainDispatcher {
  getStatus(): Promise<[address: string, status: ChainStatus]>;
  apply(): Promise<void>;
}
