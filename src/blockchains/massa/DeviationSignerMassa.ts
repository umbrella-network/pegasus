import {MassaWallet} from './MassaWallet';
import {DeviationSignerInterface} from '../../services/deviationsFeeds/interfaces/DeviationSignerInterface';
import {WalletFactory} from '../../factories/WalletFactory';
import {ChainsIds} from '../../types/ChainsIds';
import Settings from '../../types/Settings';

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
