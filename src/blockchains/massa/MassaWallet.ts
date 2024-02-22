import {Client, ClientFactory, fromMAS, IAccount, IProvider, ProviderType, WalletClient} from '@massalabs/massa-web3';
import {Logger} from 'winston';

import {ChainsIds} from '../../types/ChainsIds.js';
import {IWallet} from '../../interfaces/IWallet.js';
import {ProviderFactory} from '../../factories/ProviderFactory.js';
import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ExecutedTx} from '../../types/Consensus.js';
import logger from '../../lib/logger.js';
import {MassaProvider} from './MassaProvider.js';

// https://github.com/massalabs/massa-web3/blob/main/examples/wallet/index.ts
export class MassaWallet implements IWallet {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  readonly chainId = ChainsIds.MASSA;
  readonly provider!: ProviderInterface;

  publicKey!: string;

  protected addr!: string;
  protected rawWallet!: IAccount;
  protected rawWalletAwait!: Promise<IAccount>;
  protected client!: Client;

  constructor(privateKeyPem: string) {
    this.loggerPrefix = '[MassaWallet]';
    this.logger = logger;

    this.provider = ProviderFactory.create(ChainsIds.MASSA);
    this.rawWalletAwait = WalletClient.getAccountFromSecretKey(privateKeyPem);

    this.beforeAnyAction().then(() => {
      this.logger.info(`${this.loggerPrefix} constructor done`);
    });
  }

  async getRawWallet<T>(): Promise<T> {
    await this.beforeAnyAction();
    return this.rawWallet as unknown as T;
  }

  getRawWalletSync<T>(): T {
    throw new Error(`${this.loggerPrefix} please use: getRawWallet()`);
  }

  async getBalance(): Promise<bigint> {
    await this.beforeAnyAction();
    return this.provider.getBalance(this.addr);
  }

  async getWallet(): Promise<WalletClient> {
    await this.beforeAnyAction();
    return this.client.wallet();
  }

  async getNextNonce(): Promise<bigint> {
    this.logger.debug(`${this.loggerPrefix} getNextNonce: there is no nonce concept`);
    return 0n;
  }

  async sendTransaction(): Promise<ExecutedTx> {
    throw Error(`${this.loggerPrefix} sendTransaction(): TODO`);
  }

  toNative(value: string): bigint {
    return fromMAS(value);
  }

  async address(): Promise<string> {
    await this.beforeAnyAction();
    return this.publicKey;
  }

  private async beforeAnyAction(): Promise<void> {
    if (this.addr) return;

    const provider = await this.provider.getRawProvider<MassaProvider>();

    this.rawWallet = await this.rawWalletAwait;
    this.addr = this.rawWallet.address || 'N/A';
    this.publicKey = this.rawWallet.publicKey || 'N/A';

    this.client = await ClientFactory.createCustomClient(
      [{url: provider.providerUrl, type: ProviderType.PUBLIC} as IProvider],
      true,
      this.rawWallet,
    );

    this.logger.info(`${this.loggerPrefix} wallet initialised for ${this.address}, ${this.publicKey}`);
  }

  setRawWallet(): void {
    throw Error(`${this.loggerPrefix} setRawWallet(): not needed`);
  }
}
