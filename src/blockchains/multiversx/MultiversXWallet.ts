import {UserSigner} from '@multiversx/sdk-wallet';
import {TransactionRequest} from '@ethersproject/providers';
import {parseEther} from 'ethers/lib/utils';
import {Logger} from 'winston';

import {ChainsIds} from '../../types/ChainsIds';
import {IWallet} from '../../interfaces/IWallet';
import {ProviderFactory} from '../../factories/ProviderFactory';
import {ProviderInterface} from '../../interfaces/ProviderInterface';
import {ExecutedTx} from '../../types/Consensus';
import logger from '../../lib/logger';

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

  async sendTransaction(tr: TransactionRequest): Promise<ExecutedTx> {
    console.log('TODO sendTransaction');
    throw new Error('TODO sendTransaction');
  }

  toNative(value: string): bigint {
    return parseEther(value).toBigInt();
  }
}
