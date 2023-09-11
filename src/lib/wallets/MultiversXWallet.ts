import {UserSigner} from "@multiversx/sdk-wallet";
import {TransactionRequest} from "@ethersproject/providers";

import {ChainsIds} from '../../types/ChainsIds';
import {IWallet} from './IWallet';
import {ProviderFactory} from "../../factories/ProviderFactory";
import {IProvider} from "../providers/IProvider";
import {ExecutedTx} from "../../types/Consensus";

export class MultiversXWallet implements IWallet {
  readonly chainId = ChainsIds.MULTIVERSX;
  readonly provider!: IProvider;
  readonly rawWallet!: UserSigner;
  readonly address!: string;

  constructor(privateKeyPem: string) {
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
}
