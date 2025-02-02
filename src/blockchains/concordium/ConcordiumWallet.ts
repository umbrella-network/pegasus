import {
  AccountAddress,
  Base58String,
  HexString,
  JsonString,
  NextAccountNonce,
  parseWallet,
  WalletExportFormat,
} from '@concordium/web-sdk';
import {ConcordiumGRPCNodeClient} from '@concordium/web-sdk/nodejs';
import {utils as ethersUtils} from 'ethers';

import {ChainsIds} from '../../types/ChainsIds.js';
import {IWallet} from '../../interfaces/IWallet.js';
import {ProviderFactory} from '../../factories/ProviderFactory.js';
import {ProviderInterface} from '../../interfaces/ProviderInterface.js';
import {ExecutedTx} from '../../types/Consensus.js';
import {verifyPublicKey} from './utils/verifyPublicKey.js';

export class ConcordiumWallet implements IWallet {
  protected loggerPrefix!: string;
  readonly chainId = ChainsIds.CONCORDIUM;
  readonly provider!: ProviderInterface;

  publicAddress!: Base58String;
  rawWallet!: WalletExportFormat;

  constructor(exportedJsonPrivateKey: JsonString) {
    this.loggerPrefix = '[ConcordiumWallet]';

    this.provider = ProviderFactory.create(ChainsIds.CONCORDIUM);
    this.rawWallet = parseWallet(exportedJsonPrivateKey);
    this.publicAddress = this.rawWallet.value.address;

    if (!this.signKey()) throw new Error(`${this.loggerPrefix} empty signKey`);
  }

  async getRawWallet<T>(): Promise<T> {
    return new Promise((resolve) => resolve(this.rawWallet as unknown as T));
  }

  signKey(): HexString {
    return this.rawWallet.value.accountKeys.keys[0].keys[0].signKey;
  }

  verifyKey(): HexString {
    return this.rawWallet.value.accountKeys.keys[0].keys[0].verifyKey;
  }

  getRawWalletSync<T>(): T {
    return this.rawWallet as unknown as T;
  }

  async getBalance(): Promise<bigint> {
    await verifyPublicKey(this.signKey(), this.verifyKey(), this.loggerPrefix);

    return this.provider.getBalance(this.publicAddress);
  }

  async getNextNonce(): Promise<bigint> {
    const sender = AccountAddress.fromBase58(this.publicAddress);
    const nextNonce: NextAccountNonce = await this.provider
      .getRawProviderSync<ConcordiumGRPCNodeClient>()
      .getNextAccountNonce(sender);

    return nextNonce.nonce.value;
  }

  async sendTransaction(): Promise<ExecutedTx> {
    throw Error(`${this.loggerPrefix} sendTransaction(): TODO`);
  }

  async address(): Promise<string> {
    return new Promise((resolve) => resolve(this.publicAddress));
  }

  toNative(value: string): bigint {
    return ethersUtils.parseUnits(value, 6).toBigInt();
  }

  setRawWallet(): void {
    throw Error(`${this.loggerPrefix} setRawWallet(): not needed`);
  }
}
