import {UserSigner} from '@multiversx/sdk-wallet';
import {Logger} from 'winston';
import {utils as ethersUtils} from 'ethers';

import {ChainsIds} from '../../types/ChainsIds.js';
import {IWallet} from '../../interfaces/IWallet.js';
import {ProviderFactory} from '../../factories/ProviderFactory.js';
import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ExecutedTx} from '../../types/Consensus.js';
import logger from '../../lib/logger.js';

export class MultiversXWallet implements IWallet {
  protected logger!: Logger;
  protected loggerPrefix!: string;
  protected readonly provider!: ProviderInterface;
  protected readonly rawWallet!: UserSigner;
  protected readonly publicAddress!: string;

  readonly chainId = ChainsIds.MULTIVERSX;

  constructor(privateKeyPem: string) {
    this.logger = logger;
    this.loggerPrefix = '[MultiversXWallet]';

    this.provider = ProviderFactory.create(ChainsIds.MULTIVERSX);
    this.rawWallet = UserSigner.fromPem(privateKeyPem);
    this.publicAddress = this.rawWallet.getAddress().toString();
  }

  async getRawWallet<T>(): Promise<T> {
    return new Promise((resolve) => resolve(this.rawWallet as unknown as T));
  }

  getRawWalletSync<T>(): T {
    return this.rawWallet as unknown as T;
  }

  async address(): Promise<string> {
    return this.publicAddress;
  }

  async getBalance(): Promise<bigint> {
    return this.provider.getBalance(this.publicAddress);
  }

  async getNextNonce(): Promise<bigint> {
    return this.provider.getTransactionCount(this.publicAddress);
  }

  async sendTransaction(): Promise<ExecutedTx> {
    throw new Error('TODO sendTransaction');
  }

  toNative(value: string): bigint {
    return ethersUtils.parseEther(value).toBigInt();
  }

  setRawWallet(): void {
    throw Error(`${this.loggerPrefix} setRawWallet(): not needed`);
  }
}
