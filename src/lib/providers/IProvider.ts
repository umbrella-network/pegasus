import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
import {NetworkStatus} from '../../types/Network';

export interface IProvider {
  getRawProvider<T>(): T;
  gasEstimation(minGasPrice: number, maxGasPrice: number): Promise<GasEstimation>;
  getBlockNumber(): Promise<bigint>;
  waitForTx(txHash: string, timeoutMs: number): Promise<boolean>;
  waitUntilNextBlock(currentBlockNumber: bigint): Promise<bigint>;
  getBlockTimestamp(): Promise<number>;
  getBalance(address: string): Promise<bigint>;
  getNetwork(): Promise<NetworkStatus>;
  getTransactionCount(address: string): Promise<number>;
  call(transaction: { to: string; data: string }): Promise<string>;
  isNonceError(e: Error): boolean;
}
