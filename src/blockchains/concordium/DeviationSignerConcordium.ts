import {AccountSigner, HexString, parseWallet, WalletExportFormat, buildAccountSigner} from '@concordium/web-sdk';

import {DeviationSignerInterface} from '../../services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import Settings from '../../types/Settings.js';
import {verifyPublicKey} from './utils/verifyPublicKey.js';

export class DeviationSignerConcordium implements DeviationSignerInterface {
  private readonly pk!: WalletExportFormat;
  private readonly signer!: AccountSigner;
  private publicKey!: HexString;

  constructor(settings: Settings) {
    const {privateKey} = settings.blockchain.wallets[ChainsIds.CONCORDIUM];
    if (!privateKey) throw new Error('[DeviationSignerConcordium] empty privateKey');

    this.pk = parseWallet(privateKey);
    console.log('DeviationSignerConcordium:', JSON.stringify(this.pk));
    this.signer = buildAccountSigner(this.signKey());
    this.publicKey = this.verifyKey();

    if (!this.signer) throw new Error(`[DeviationSignerConcordium] empty signer for ${ChainsIds.CONCORDIUM}`);
  }

  async apply(hash: HexString): Promise<string> {
    await verifyPublicKey(this.signKey(), this.publicKey, '[DeviationSignerConcordium]');

    const toSign = Buffer.from(hash, 'hex');

    const signature = await this.signer.sign(toSign);
    return `${this.publicKey}@${signature['0']['0']}`;
  }

  async address(): Promise<string> {
    return this.publicKey;
  }

  private signKey(): HexString {
    return this.pk.value.accountKeys.keys[0].keys[0].signKey;
  }

  private verifyKey(): HexString {
    return this.pk.value.accountKeys.keys[0].keys[0].verifyKey;
  }
}
