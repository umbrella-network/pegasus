import {TransactionRequest} from '@ethersproject/providers';
import {ExecutedTx} from '../types/Consensus.js';

export interface IWallet {
  readonly chainId: string;
  readonly address: string;

  rawWallet: unknown;

  getRawWallet<T>(): T;
  getBalance(): Promise<bigint>;
  getNextNonce(): Promise<number>;
  sendTransaction(tr: TransactionRequest): Promise<ExecutedTx>;
  toNative(value: string): bigint;
}
