import {ChainStatus} from '../../types/ChainStatus.js';

export interface IBlockChainDispatcher {
  getStatus(): Promise<[address: string, status: ChainStatus]>;
  apply(): Promise<void>;
}
