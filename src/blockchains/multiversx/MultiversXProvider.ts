import {Account, Address, TransactionWatcher} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {Logger} from 'winston';
import axios from 'axios';
import BigNumber from 'bignumber.js';

import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {NetworkStatus} from '../../types/Network.js';
import Settings from '../../types/Settings.js';
import {Timeout} from '../../services/tools/Timeout.js';
import logger from '../../lib/logger.js';
import settings from '../../config/settings.js';

export class MultiversXProvider implements ProviderInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  protected settings!: Settings;
  protected readonly chainId = ChainsIds.MULTIVERSX;
  protected readonly provider: ApiNetworkProvider | undefined;
  protected readonly providerUrl!: string;
  protected readonly timeout = 5000;
  protected cacheChainID: string | undefined;

  constructor(providerUrl: string) {
    this.logger = logger;
    this.loggerPrefix = '[MultiversXProvider]';
    this.settings = settings;
    this.providerUrl = providerUrl;
    this.provider = new ApiNetworkProvider(providerUrl);
  }

  async getRawProvider<T>(): Promise<T> {
    return new Promise((resolve) => resolve(this.provider as unknown as T));
  }

  getRawProviderSync<T>(): T {
    return this.provider as unknown as T;
  }

  getProviderUrl(): string {
    return this.providerUrl;
  }

  async getBlockNumber(): Promise<bigint> {
    if (!this.provider) throw Error(`${this.loggerPrefix} getBlockNumber(): provider not set`);

    const network = await this.provider.getNetworkGeneralStatistics();
    return BigInt(network.Blocks.toString());
  }

  async getBlockTimestamp(): Promise<number> {
    if (!this.provider) throw Error(`${this.loggerPrefix} getBlockTimestamp(): provider not set`);

    const blockUrl = `${this.providerUrl}/blocks/latest`;
    const latestBlock = await axios.get(blockUrl, {timeout: this.timeout});

    if (latestBlock.status != 200) {
      throw new Error(`${blockUrl} ${latestBlock.status} ${latestBlock.statusText}`);
    }

    return latestBlock.data.timestamp;
  }

  async getBalance(address: string): Promise<bigint> {
    const account = await this.accountData(address);
    return BigInt((account.balance as BigNumber).toFixed(0));
  }

  async getNetwork(): Promise<NetworkStatus> {
    // this is arbitrary number, must be correlated with number in smart contract
    let id: number;

    const chainID = await this.getChainID();

    // 19800 is arbitrary number: BigInt('0x' + Buffer.from("MX").toString('hex'));
    switch (chainID) {
      case '1':
        id = 198001;
        break; // id generated by: generateChainId(this.chainId);
      case 'T':
        id = 198002;
        break;
      case 'D':
        id = 198003;
        break;
      default:
        throw new Error(`${this.loggerPrefix} unknown chainID ${chainID}`);
    }

    return {name: this.chainId, id};
  }

  async getChainID(): Promise<string> {
    if (!this.cacheChainID) {
      if (!this.provider) throw new Error(`${this.loggerPrefix} getNetwork(): no provider`);

      const network = await this.provider.getNetworkConfig();
      this.cacheChainID = network.ChainID;
    }

    return this.cacheChainID;
  }

  async getTransactionCount(address: string): Promise<bigint> {
    const account = await this.accountData(address);
    return BigInt(account.nonce.valueOf());
  }

  async waitForTx(txHash: string, timeoutMs: number): Promise<boolean> {
    if (!this.provider) throw new Error(`${this.loggerPrefix} waitForTx: provider not set`);

    const watcher = new TransactionWatcher(this.provider);

    interface ITransaction {
      getHash(): {
        hex(): string;
      };
    }

    const txHex = {
      hex: () => txHash,
    };

    const tx: ITransaction = {
      getHash: () => txHex,
    };

    this.logger.info(`${this.loggerPrefix} waitForTx: ${txHash}`);

    // `awaitPending` was causing issues, we were getting errors "Expected transaction status not reached"
    // with only `awaitCompleted` looks like it is working well.
    // const transactionOnNetworkPending = await Promise.race([watcher.awaitPending(tx), Timeout.apply(timeoutMs)]);
    //
    // this.logger.info(`${this.loggerPrefix} transactionOnNetworkPending: ${txHash}`);
    //
    // if (!transactionOnNetworkPending) {
    //   this.logger.error(`${this.loggerPrefix} waitForTx: ${txHash} pending timeout ${timeoutMs}ms`);
    //   return false;
    // }
    //
    // this.logger.info(`${this.loggerPrefix} tx ${txHash} is pending`);
    //
    // if (!transactionOnNetworkPending.status.isPending()) {
    //   this.logger.error(`${this.loggerPrefix} waitForTx: ${txHash} not pending`);
    //   return false;
    // }

    const transactionOnNetwork = await Promise.race([watcher.awaitCompleted(tx), Timeout.apply(timeoutMs)]);

    if (!transactionOnNetwork) {
      this.logger.error(`${this.loggerPrefix} waitForTx: ${txHash} awaitCompleted timeout ${timeoutMs}ms`);
      return false;
    }

    if (transactionOnNetwork.status.isInvalid()) {
      this.logger.error(`${this.loggerPrefix} waitForTx: ${txHash} is invalid`);
      return false;
    }

    if (transactionOnNetwork.status.isFailed()) {
      this.logger.error(`${this.loggerPrefix} waitForTx: ${txHash} failed`);
      return false;
    }

    if (!transactionOnNetwork.status.isExecuted()) {
      this.logger.error(`${this.loggerPrefix} waitForTx: ${txHash} is NOT executed`);
      return false;
    }

    this.logger.info(`${this.loggerPrefix} tx ${txHash} successful`);

    return true;
  }

  async waitUntilNextBlock(): Promise<bigint> {
    this.logger.debug(`${this.loggerPrefix} waitUntilNextBlock: we only waiting for tx`);
    return 0n;
  }

  async call(): Promise<string> {
    // this is only needed for new chain architecture detection
    // once we create new chain for solana, we will need to implement this method
    throw new Error(`${this.loggerPrefix} .call not supported yet`);
  }

  async gasEstimation(minGasPrice: number): Promise<GasEstimation> {
    console.log('TODO gasEstimation');

    return {
      baseFeePerGas: 0,
      gasPrice: 0,
      maxPriorityFeePerGas: 0,
      maxFeePerGas: 0,
      isTxType2: true,
      min: minGasPrice,
      max: Number.MAX_SAFE_INTEGER,
      avg: 1,
    };
  }

  isNonceError(e: Error): boolean {
    return e.message.includes('lowerNonceInT') || e.message.includes('veryHighNonceInTx');
  }

  getBlock(): Promise<void> {
    throw new Error(`${this.loggerPrefix} getBlock(): not supported`);
  }

  protected async accountData(erdAddress: string): Promise<Account> {
    if (!this.provider) throw new Error(`${this.loggerPrefix} accountData(): no provider`);

    const account = new Account(new Address(erdAddress));
    const accountOnNetwork = await this.provider.getAccount(new Address(erdAddress));
    account.update(accountOnNetwork);

    return account;
  }
}
