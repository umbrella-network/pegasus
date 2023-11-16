import {MassaWallet} from './MassaWallet.js';
import {DeviationSignerInterface} from '../../services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {WalletFactory} from '../../factories/WalletFactory.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import Settings from '../../types/Settings.js';

export class DeviationSignerMassa implements DeviationSignerInterface {
  private readonly signer!: MassaWallet;

  constructor(settings: Settings) {
    this.signer = WalletFactory.create(settings, ChainsIds.MASSA) as MassaWallet;
  }

  async apply(dataHash: string): Promise<string> {
    await this.signer.beforeAnyAction();
    const toSig = Buffer.from(dataHash.replace('0x', ''), 'hex').toString('base64');

    const wallet = await this.signer.getWallet();
    const signature = await wallet.signMessage(toSig, this.signer.address);

    return `${this.signer.publicKey}@${signature.base58Encoded}`;
  }
}
