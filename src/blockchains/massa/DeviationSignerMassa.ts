import {IAccount} from '@massalabs/massa-web3';

import {MassaWallet} from './MassaWallet.js';
import {DeviationSignerInterface} from '../../services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {WalletFactory} from '../../factories/WalletFactory.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import Settings from '../../types/Settings.js';

export class DeviationSignerMassa implements DeviationSignerInterface {
  private readonly settings!: Settings;
  private signer!: MassaWallet;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  async apply(dataHash: string): Promise<string> {
    const blockchainId = this.settings.blockchain.multiChains[ChainsIds.MASSA]?.blockchainId;
    if (!blockchainId) throw new Error(`[${ChainsIds.MASSA}][DeviationSignerMassa] empty chainId`);

    await this.createWallet();
    const toSig = Buffer.from(dataHash.replace('0x', ''), 'hex').toString('base64');

    const wallet = await this.signer.getWallet();
    const account = await this.signer.getRawWallet<IAccount>();
    if (!account.address) throw new Error(`[${ChainsIds.MASSA}][DeviationSignerMassa] empty address`);

    const signature = await wallet.signMessage(toSig, BigInt(blockchainId), account.address);

    return `${account.publicKey}@${signature.base58Encoded}`;
  }

  async address(): Promise<string> {
    await this.createWallet();
    return this.signer.address();
  }

  private async createWallet(): Promise<void> {
    if (this.signer) return;

    this.signer = WalletFactory.create(this.settings, ChainsIds.MASSA) as MassaWallet;
  }
}
