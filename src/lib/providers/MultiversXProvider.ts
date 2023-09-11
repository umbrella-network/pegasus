import { Account, Address } from "@multiversx/sdk-core";
import {ApiNetworkProvider} from "@multiversx/sdk-network-providers";
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
import {TransactionWatcher} from "@multiversx/sdk-core/out";
import {Logger} from "winston";
import axios from "axios";
import BigNumber from "bignumber.js";

import {IProvider} from './IProvider';
import {ChainsIds} from '../../types/ChainsIds';
import {NetworkStatus} from '../../types/Network';
import {sleep} from "../../utils/sleep";
import Settings from "../../types/Settings";
import {Timeout} from "../../services/tools/Timeout";
import logger from '../../lib/logger';
import settings from "../../config/settings";

export class MultiversXProvider implements IProvider {
  protected logger!: Logger;
  protected settings!: Settings;
  protected readonly chainId = ChainsIds.MULTIVERSX;
  protected readonly provider: ApiNetworkProvider | undefined;
  protected readonly providerUrl!: string;
  protected readonly timeout = 5000;

  constructor(providerUrl: string) {
    this.logger = logger;
    this.settings = settings;
    this.providerUrl = providerUrl;
    this.provider = new ApiNetworkProvider(providerUrl);
  }

  getRawProvider<T>(): T {
    return this.provider as unknown as T;
  }

  async getBlockNumber(): Promise<bigint> {
    if (!this.provider) throw Error(`[${this.chainId}] getBlockNumber(): provider not set`);

    const network = await this.provider.getNetworkGeneralStatistics();
    return BigInt(network.Blocks.toString());
  }

  async getBlockTimestamp(): Promise<number> {
    if (!this.provider) throw Error(`[${this.chainId}] getBlockTimestamp(): provider not set`);

    const blockUrl = `${this.providerUrl}/blocks/latest`;
    const latestBlock = await axios.get(blockUrl, {timeout: this.timeout});

    if (latestBlock.status != 200) {
      throw new Error(`${blockUrl} ${latestBlock.status} ${latestBlock.statusText}`)
    }

    return latestBlock.data.timestamp;
  }

  async getBalance(address: string): Promise<bigint> {
    const account = await this.accountData(address);
    return BigInt((account.balance as BigNumber).toFixed(0));
  }

  async getNetwork(): Promise<NetworkStatus> {
    if (!this.provider) throw new Error(`[${this.chainId}] getNetwork(): no provider`);

    const network = await this.provider.getNetworkConfig();

    // this is arbitrary number, must be correlated with number in smart contract
    let id = 19800 * 10; // BigInt('0x' + Buffer.from("MX").toString('hex'));

    switch (network.ChainID) {
      case '1': id += 1; break;
      case 'T': id += 2; break;
      case 'D': id += 3; break;
      default: id += 9;
    }

    return {name: this.chainId, id};
  }

  async getTransactionCount(address: string): Promise<number> {
    const account = await this.accountData(address);
    return account.nonce as number;
  }

  async waitForTx(txHash: string, timeoutMs: number): Promise<boolean> {
    if (!this.provider) throw new Error(`[MultiversXProvider] waitForTx: provider not set`);

    const watcher = new TransactionWatcher(this.provider);

    interface ITransaction {
      getHash(): {
        hex(): string;
      };
    }

    const txHex = {
      hex: () => txHash
    }

    const tx: ITransaction = {
      getHash: () => txHex
    }

    const transactionOnNetworkPending = await Promise.race([watcher.awaitPending(tx), Timeout.apply(timeoutMs)]);

    if (!transactionOnNetworkPending) {
      this.logger.error(`[MultiversXProvider] waitForTx: ${txHash} pending timeout ${timeoutMs}ms`);
      return false;
    }

    this.logger.info(`[MultiversXProvider] tx ${txHash}  is pending`);

    if (!transactionOnNetworkPending.status.isPending()) {
      this.logger.error(`[MultiversXProvider] waitForTx: ${txHash} not pending`);
      return false;
    }

    const transactionOnNetwork = await Promise.race([watcher.awaitCompleted(tx), Timeout.apply(timeoutMs)]);

    if (!transactionOnNetwork) {
      this.logger.error(`[MultiversXProvider] waitForTx: ${txHash} awaitCompleted timeout ${timeoutMs}ms`);
      return false;
    }

    if (transactionOnNetwork.status.isInvalid()) {
      this.logger.error(`[MultiversXProvider] waitForTx: ${txHash} is invalid`);
      return false;
    }

    if (transactionOnNetwork.status.isFailed()) {
      this.logger.error(`[MultiversXProvider] waitForTx: ${txHash} failed`);
      return false;
    }

    if (!transactionOnNetwork.status.isExecuted()) {
      this.logger.error(`[MultiversXProvider] waitForTx: ${txHash} is NOT executed`);
      return false;
    }

    this.logger.info(`[MultiversXProvider] tx ${txHash} successful`);

    return true;
  }

  async waitUntilNextBlock(currentBlockNumber: bigint): Promise<bigint> {
    let newBlockNumber = 0n;

    while (currentBlockNumber >= newBlockNumber) {
      this.logger.info(`[${this.chainId}] waitUntilNextBlock: current ${currentBlockNumber}`);
      await sleep(this.settings.blockchain.transactions.waitForBlockTime);
      newBlockNumber = await this.getBlockNumber();
    }

    return newBlockNumber;
  }

  async call(transaction: { to: string; data: string }): Promise<string> {
    // this is only needed for new chain architecture detection
    // once we create new chain for solana, we will need to implement this method
    throw new Error('X.call not supported yet');
  }

  async gasEstimation(minGasPrice: number, maxGasPrice: number): Promise<GasEstimation> {
    console.log('TODO gasEstimation');

    return {
      baseFeePerGas: 0,
      gasPrice: 0,
      maxPriorityFeePerGas: 0,
      maxFeePerGas: 0,
      isTxType2: true,
      min: minGasPrice,
      max: maxGasPrice,
      avg: 1
    }
  }

  isNonceError(e: Error): boolean {
    return e.message.includes('lowerNonceInT') || e.message.includes('veryHighNonceInTx');
  }

  protected async accountData(erdAddress: string): Promise<Account> {
    if (!this.provider) throw new Error(`[${this.chainId}] accountData(): no provider`);

    const account = new Account(new Address(erdAddress));
    const accountOnNetwork = await this.provider.getAccount(new Address(erdAddress));
    account.update(accountOnNetwork);

    return account;
  }
}
