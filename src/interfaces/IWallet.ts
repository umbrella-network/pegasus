import {TransactionRequest} from '@ethersproject/providers';
import {ExecutedTx} from '../types/Consensus.js';

export interface IWallet {
  readonly chainId: string;

  getRawWallet<T>(): Promise<T>;
  getRawWalletSync<T>(): T;
  getBalance(): Promise<bigint>;
  getNextNonce(): Promise<bigint>;
  sendTransaction(tr: TransactionRequest): Promise<ExecutedTx>;
  toNative(value: string): bigint;
  address(): Promise<string>;

  // this is only for tests purposes
  setRawWallet(wallet: unknown): void;
}
