import {Wallet} from 'ethers';
import {BaseProvider, TransactionRequest, TransactionResponse} from "@ethersproject/providers";
import {Logger} from "winston";

import {ChainsIds} from '../../types/ChainsIds';
import {IWallet} from './IWallet';
import {ProviderFactory} from "../../factories/ProviderFactory";
import {ExecutedTx} from "../../types/Consensus";
import logger from '../../lib/logger';

export class EvmWallet implements IWallet {
  protected logger!: Logger;

  readonly chainId!: ChainsIds;
  readonly provider!: BaseProvider;
  readonly address!: string;

  rawWallet!: Wallet;

  constructor(chainId: ChainsIds, privateKey: string) {
    this.provider = ProviderFactory.create(chainId).getRawProvider<BaseProvider>();
    this.rawWallet = new Wallet(privateKey, this.provider);
    this.address = this.rawWallet.address;
    this.logger = logger;
  }

  getRawWallet<T>(): T {
    return this.rawWallet as unknown as T;
  }

  async getBalance(): Promise<bigint> {
    const balance = await this.rawWallet.getBalance();
    return balance.toBigInt();
  }

  async getNextNonce(): Promise<number> {
    return this.rawWallet.getTransactionCount('latest');
  }

  async sendTransaction(tr: TransactionRequest): Promise<ExecutedTx> {

    const txResponse: TransactionResponse = await this.rawWallet.sendTransaction(tr);

    this.logger.info(`[${this.chainId}] tx nonce: ${txResponse.nonce}, hash: ${txResponse.hash}`);

    const atBlock = txResponse.blockNumber
      ? BigInt(txResponse.blockNumber)
      : BigInt(await this.provider.getBlockNumber());

    return {hash: txResponse.hash, atBlock};
  }
}
