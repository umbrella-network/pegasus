import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {ethers} from 'ethers';
import {Logger} from 'winston';

import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {GasEstimator} from '@umb-network/toolbox';

import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {NetworkStatus} from '../../types/Network.js';
import {sleep} from '../../utils/sleep.js';
import Settings from '../../types/Settings.js';
import {Timeout} from '../../services/tools/Timeout.js';
import logger from '../../lib/logger.js';
import settings from '../../config/settings.js';

export class EvmProvider implements ProviderInterface {
  protected logger!: Logger;
  protected settings!: Settings;
  protected logPrefix!: string;
  protected readonly chainId!: ChainsIds;
  protected readonly provider!: StaticJsonRpcProvider;

  constructor(chainId: ChainsIds, url: string) {
    this.logger = logger;
    this.logPrefix = `[EvmProvider][${chainId}]`;
    this.settings = settings;
    this.chainId = chainId;
    this.provider = new ethers.providers.StaticJsonRpcProvider(url);
  }

  getRawProvider<T>(): T {
    return this.provider as unknown as T;
  }

  async gasEstimation(minGasPrice: number): Promise<GasEstimation> {
    return GasEstimator.apply(this.provider, minGasPrice, Number.MAX_SAFE_INTEGER);
  }

  async getBlockNumber(): Promise<bigint> {
    return BigInt(await this.provider.getBlockNumber());
  }

  async getBlockTimestamp(): Promise<number> {
    return (await this.provider.getBlock('latest')).timestamp;
  }

  async getBalance(address: string): Promise<bigint> {
    const balance = await this.provider.getBalance(address);
    return balance.toBigInt();
  }

  async getNetwork(): Promise<NetworkStatus> {
    if (!this.provider) throw new Error(`[${this.logPrefix}] getNetwork(): no provider`);

    const status = await this.provider.getNetwork();
    return {name: status.name, id: status.chainId};
  }

  async getTransactionCount(address: string): Promise<number> {
    return this.provider.getTransactionCount(address);
  }

  async waitForTx(txHash: string, timeoutMs: number): Promise<boolean> {
    const receipt = await Promise.race([this.provider.waitForTransaction(txHash), Timeout.apply(timeoutMs)]);
    return receipt ? receipt.status == 1 : false;
  }

  async waitUntilNextBlock(currentBlockNumber: bigint): Promise<bigint> {
    // it would be nice to subscribe for blockNumber, but we're forcing http for RPC
    // this is not pretty solution, but we're using proxy, so infura calls should not increase
    let newBlockNumber = await this.getBlockNumber();

    while (currentBlockNumber >= newBlockNumber) {
      this.logger.info(`[${this.logPrefix}] waitUntilNextBlock: current ${currentBlockNumber}`);
      await sleep(this.settings.blockchain.transactions.waitForBlockTime);
      newBlockNumber = await this.getBlockNumber();
    }

    return newBlockNumber;
  }

  async call(transaction: {to: string; data: string}): Promise<string> {
    return this.provider.call(transaction);
  }

  isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }
}
