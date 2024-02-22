import {UserSigner} from '@multiversx/sdk-wallet';

import {ethers} from 'ethers';
import {DeviationSignerInterface} from '../../services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {WalletFactory} from '../../factories/WalletFactory.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import Settings from '../../types/Settings.js';

export class DeviationSignerMultiversX implements DeviationSignerInterface {
  private readonly signer!: UserSigner;

  constructor(settings: Settings) {
    this.signer = WalletFactory.create(settings, ChainsIds.MULTIVERSX).getRawWalletSync();
  }

  async apply(dataHash: string): Promise<string> {
    const newData = Buffer.concat([
      Buffer.from('\x19MultiversX Signed Message:\n32'),
      Buffer.from(dataHash.replace('0x', ''), 'hex'),
    ]);

    const newDataHash = ethers.utils.keccak256(newData);
    const signature = await this.signer.sign(Buffer.from(newDataHash.replace('0x', ''), 'hex'));

    return `${this.signer.getAddress().bech32()}@${signature.toString('hex')}`;
  }

  async address(): Promise<string> {
    return this.signer.getAddress().bech32();
  }
}
