import {credentials} from '@grpc/grpc-js';

import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {Logger} from 'winston';
import {ConcordiumGRPCNodeClient} from '@concordium/web-sdk/nodejs';
import {
  AccountAddress,
  Base58String,
  FailedTransactionSummary,
  TransactionHash,
  TransactionKindString,
  TransactionSummaryType,
} from '@concordium/web-sdk';

import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {NetworkStatus} from '../../types/Network.js';
import Settings from '../../types/Settings.js';
import logger from '../../lib/logger.js';
import settings from '../../config/settings.js';
import {decodeError} from './utils/errors.js';

// https://github.com/Concordium/concordium-node-sdk-js/tree/main/examples/client
export class ConcordiumProvider implements ProviderInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  protected settings!: Settings;
  protected readonly chainId = ChainsIds.CONCORDIUM;
  protected provider: ConcordiumGRPCNodeClient | undefined;
  protected readonly providerUrl!: string;
  protected readonly timeout = 5000;

  constructor(providerUrl: string) {
    this.logger = logger;
    this.loggerPrefix = '[ConcordiumProvider]';
    this.settings = settings;
    this.providerUrl = providerUrl;

    const [address, port, insecure] = providerUrl.split(':');

    this.provider = new ConcordiumGRPCNodeClient(
      address,
      parseInt(port, 10),
      insecure ? credentials.createInsecure() : credentials.createSsl(),
    );
  }

  async getRawProvider<T>(): Promise<T> {
    return new Promise((resolve) => resolve(this.provider as unknown as T));
  }

  getRawProviderSync<T>(): T {
    return this.provider as unknown as T;
  }

  async getBlockNumber(): Promise<bigint> {
    if (!this.provider) throw Error(`${this.loggerPrefix} getBlockNumber(): provider not set`);

    const blockInfo = await this.provider.getBlockInfo();
    return blockInfo.blockHeight;
  }

  async getBlockTimestamp(): Promise<number> {
    if (!this.provider) throw Error(`${this.loggerPrefix} getBlockNumber(): provider not set`);

    const blockInfo = await this.provider.getBlockInfo();
    return Math.trunc(new Date(blockInfo.blockSlotTime).getTime() / 1000);
  }

  async getBalance(address: Base58String): Promise<bigint> {
    if (!this.provider) throw Error(`${this.loggerPrefix} getBalance(): provider not set`);

    const accountAddress = AccountAddress.fromBase58(address);
    const accountInfo = await this.provider.getAccountInfo(accountAddress);

    return accountInfo.accountAmount.microCcdAmount;
  }

  async getNetwork(): Promise<NetworkStatus> {
    if (!this.provider) throw new Error(`${this.loggerPrefix} getNetwork(): no provider`);

    return {name: ChainsIds.CONCORDIUM, id: -1};
  }

  async getTransactionCount(): Promise<bigint> {
    throw Error(`${this.loggerPrefix} getTransactionCount(): use Wallet`);
  }

  async waitForTx(txHash: string, timeoutMs: number): Promise<boolean> {
    if (!this.provider) throw new Error(`${this.loggerPrefix} waitForTx: provider not set`);

    const blockHash = await this.provider.waitForTransactionFinalization(
      TransactionHash.fromHexString(txHash),
      timeoutMs,
    );

    if (blockHash.summary.type != TransactionSummaryType.AccountTransaction) {
      this.logger.error(`${this.loggerPrefix} ${txHash} summary.type: ${blockHash.summary.type}`);
      return false;
    }

    if (blockHash.summary.transactionType == TransactionKindString.Failed) {
      const reason = decodeError(blockHash.summary as FailedTransactionSummary);
      this.logger.error(`${this.loggerPrefix} ${txHash} ${reason}`);
      return false;
    }

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

  async gasEstimation(): Promise<GasEstimation> {
    throw new Error(`${this.loggerPrefix} gasEstimation done by 'update()' method directly`);
  }

  isNonceError(): boolean {
    return false;
  }

  getBlock(): Promise<void> {
    throw new Error(`${this.loggerPrefix} getBlock(): not supported`);
  }
}
