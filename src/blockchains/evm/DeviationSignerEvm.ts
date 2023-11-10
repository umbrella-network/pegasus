import {ethers, Wallet} from 'ethers';
import {DeviationSignerInterface} from '../../services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {WalletFactory} from '../../factories/WalletFactory.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import Settings from '../../types/Settings.js';

export class DeviationSignerEvm implements DeviationSignerInterface {
  private readonly signer!: Wallet;

  constructor(settings: Settings, chainId: ChainsIds) {
    this.signer = WalletFactory.create(settings, chainId).getRawWallet();
  }

  async apply(hash: string): Promise<string> {
    const toSign = ethers.utils.arrayify(hash);
    return this.signer.signMessage(toSign);
  }
}
