import {BigNumber} from 'ethers';
import {NetworkStatus} from '../../types/Network';

export interface IProvider {
  getBlockNumber(): Promise<number>;
  getBalance(address: string): Promise<BigNumber>;
  getNetwork(): NetworkStatus;
  getTransactionCount(address: string): Promise<number>;
  call(transaction: { to: string; data: string }): Promise<string>;
}
