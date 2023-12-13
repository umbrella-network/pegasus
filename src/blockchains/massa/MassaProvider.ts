import {Client, ClientFactory, EOperationStatus, IEvent, IProvider, ProviderType} from '@massalabs/massa-web3';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {Logger} from 'winston';

import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {NetworkStatus} from '../../types/Network.js';
import logger from '../../lib/logger.js';
import {Timeout} from '../../services/tools/Timeout.js';

export class MassaProvider implements ProviderInterface {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  protected readonly chainId = ChainsIds.MASSA;
  protected client: Client | undefined;

  readonly providerUrl!: string;

  constructor(providerUrl: string) {
    this.logger = logger;
    this.loggerPrefix = '[MassaProvider]';
    this.providerUrl = providerUrl;

    this.beforeAnyAction().then(() => {
      this.logger.info(`${this.loggerPrefix} Client initialised`);
    });
  }

  async getRawProvider<T>(): Promise<T> {
    await this.beforeAnyAction();
    return this.client as unknown as T;
  }

  getRawProviderSync<T>(): T {
    throw new Error(`${this.loggerPrefix} please use: getRawProvider()`);
  }

  async getBlockNumber(): Promise<bigint> {
    await this.beforeAnyAction();

    if (!this.client) throw Error(`${this.loggerPrefix} getBlockNumber(): provider not set`);

    const status = await (await this.client).publicApi().getNodeStatus();
    return BigInt(status.last_slot.period);
  }

  async getBlockTimestamp(): Promise<number> {
    await this.beforeAnyAction();

    if (!this.client) throw Error(`${this.loggerPrefix} getBlockTimestamp(): provider not set`);

    const status = await this.client.publicApi().getNodeStatus();
    return Math.floor(status.current_time / 1000);
  }

  async getBalance(address: string): Promise<bigint> {
    await this.beforeAnyAction();

    if (!this.client) throw Error(`${this.loggerPrefix} getBalance(): provider not set`);

    const balance = await this.client.wallet().getAccountBalance(address);
    return balance ? balance.final : 0n;
  }

  async getNetwork(): Promise<NetworkStatus> {
    // generateChainId(this.chainId) => 786005736
    // For now, return 13119191 (m=13, a=1, s=19, s=19, a=1)
    return {name: this.chainId, id: 13119191};
  }

  async getTransactionCount(): Promise<bigint> {
    throw Error(`${this.loggerPrefix} getTransactionCount(): use MassaWallet`);
  }

  async waitForTx(operationId: string, timeoutMs: number): Promise<boolean> {
    await this.beforeAnyAction();

    if (!this.client) throw new Error(`${this.loggerPrefix} waitForTx: provider not set`);

    const finalStatus = await Promise.race([
      this.client.smartContracts().awaitRequiredOperationStatus(operationId, EOperationStatus.SPECULATIVE_SUCCESS),
      this.client.smartContracts().awaitRequiredOperationStatus(operationId, EOperationStatus.SPECULATIVE_ERROR),
      Timeout.apply(timeoutMs),
    ]);

    if (finalStatus === undefined) {
      this.logger.error(`${this.loggerPrefix} tx ${operationId} timeout after ${timeoutMs / 1000} sec`);
      return false;
    }

    const events: IEvent[] = await this.client.smartContracts().getFilteredScOutputEvents({
      emitter_address: null,
      start: null,
      end: null,
      original_caller_address: null,
      original_operation_id: operationId,
      is_final: true,
    });

    if (finalStatus != EOperationStatus.SPECULATIVE_SUCCESS) {
      this.logger.error(`${this.loggerPrefix} tx ${operationId} ${EOperationStatus[finalStatus]}`);
      this.logger.error(`${this.loggerPrefix} tx ${operationId} event data: ${events.pop()?.data}`);
    }

    return finalStatus == EOperationStatus.SPECULATIVE_SUCCESS;
  }

  async waitUntilNextBlock(): Promise<bigint> {
    this.logger.debug(`${this.loggerPrefix} waitUntilNextBlock: we only waiting for tx`);
    return 0n;
  }

  async call(): Promise<string> {
    await this.beforeAnyAction();

    // this is only needed for new chain architecture detection
    // once we create new chain for solana, we will need to implement this method
    throw new Error(`${this.loggerPrefix} .call not supported yet`);
  }

  async gasEstimation(minGasPrice: number): Promise<GasEstimation> {
    console.log('MassaProvider TODO gasEstimation');

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

  isNonceError(): boolean {
    return false;
  }

  getBlock(): Promise<void> {
    throw new Error(`${this.loggerPrefix} getBlock(): not supported`);
  }

  private async beforeAnyAction(): Promise<void> {
    if (this.client) return;
    if (!this.providerUrl) return;

    this.client = await ClientFactory.createCustomClient(
      [
        {url: this.providerUrl, type: ProviderType.PUBLIC} as IProvider,
        // { url: privateApi, type: ProviderType.PRIVATE } as IProvider,
      ],
      true,
    );
  }
}
