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
  address!: string;
  publicKey!: string;
  rawWallet!: IAccount;
  protected rawWalletAwait!: Promise<IAccount>;
  protected client!: Client;

  constructor(privateKeyPem: string) {
    this.loggerPrefix = '[MassaWallet]';
    this.logger = logger;

    this.provider = ProviderFactory.create(ChainsIds.MASSA);
    this.rawWalletAwait = WalletClient.getAccountFromSecretKey(privateKeyPem);

    this.beforeAnyAction();
  }

  getRawWallet<T>(): T {
    return this.rawWallet as unknown as T;
  }

  async getBalance(): Promise<bigint> {
    await this.beforeAnyAction();
    return this.provider.getBalance(this.address);
  }

  async getWallet(): Promise<WalletClient> {
    await this.beforeAnyAction();
    return this.client.wallet();
  }

  async getNextNonce(): Promise<number> {
    this.logger.debug(`${this.loggerPrefix} getNextNonce: there is no nonce concept`);
    return 0;
  }

  async sendTransaction(): Promise<ExecutedTx> {
    throw Error(`${this.loggerPrefix} sendTransaction(): TODO`);
  }

  async beforeAnyAction(): Promise<void> {
    if (this.address) return;

    await (this.provider as MassaProvider).beforeAnyAction();

    this.rawWallet = await this.rawWalletAwait;
    this.address = this.rawWallet.address || 'N/A';
    this.publicKey = this.rawWallet.publicKey || 'N/A';

    this.client = await ClientFactory.createCustomClient(
      [{url: (this.provider as MassaProvider).providerUrl, type: ProviderType.PUBLIC} as IProvider],
      true,
      this.rawWallet,
    );

    this.logger.info(`${this.loggerPrefix} wallet initialised for ${this.address}, ${this.publicKey}`);
  }

  toNative(value: string): bigint {
    return fromMAS(value);
  }
}
