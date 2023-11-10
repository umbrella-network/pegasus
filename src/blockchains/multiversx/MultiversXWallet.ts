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
  protected logPrefix!: string;

  readonly chainId = ChainsIds.MULTIVERSX;
  readonly provider!: ProviderInterface;
  readonly rawWallet!: UserSigner;
  readonly address!: string;

  constructor(privateKeyPem: string) {
    this.logger = logger;
    this.logPrefix = '[MultiversXWallet]';

    this.provider = ProviderFactory.create(ChainsIds.MULTIVERSX);
    this.rawWallet = UserSigner.fromPem(privateKeyPem);
    this.address = this.rawWallet.getAddress().toString();
  }

  getRawWallet<T>(): T {
    return this.rawWallet as unknown as T;
  }

  async getBalance(): Promise<bigint> {
    return this.provider.getBalance(this.address);
  }

  async getNextNonce(): Promise<number> {
    return this.provider.getTransactionCount(this.address);
  }

  async sendTransaction(): Promise<ExecutedTx> {
    throw new Error('TODO sendTransaction');
  }

  toNative(value: string): bigint {
    return ethersUtils.parseEther(value).toBigInt();
  }
}
