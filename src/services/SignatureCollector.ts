import {inject, injectable} from 'inversify';
import axios from 'axios';
import sort from 'fast-sort';
import {Logger} from 'winston';

import {SignedBlock} from '../types/SignedBlock';
import Blockchain from '../lib/Blockchain';
import BlockMinter from './BlockMinter';
import {Validator} from '../types/Validator';
import Settings from '../types/Settings';

@injectable()
class SignatureCollector {
  @inject('Logger') private logger!: Logger;
  @inject(Blockchain) private blockchain!: Blockchain;
  @inject('Settings') private settings!: Settings;

  async apply(block: SignedBlock, affidavit: string, validators: Validator[]): Promise<string[]> {
    const signatures = await Promise.all(sort(validators)
      .desc(({id}) => id === this.blockchain.wallet.address) // the leader's signature should go first
      .map((validator: Validator) => this.collectSignature(validator, block, affidavit)));

    return [...new Set(signatures.flat())];
  }

  private async collectSignature(validator: Validator, block: SignedBlock, affidavit: string): Promise<string[]> {
    const {id, location} = validator;

    if (id === this.blockchain.wallet.address) {
      return [block.signature];
    }

    try {
      const signature = await SignatureCollector.requestSignature(location, block, this.settings.signatureTimeout);

      const signerAddress = await BlockMinter.recoverSigner(affidavit, signature);
      if (signerAddress !== id) {
        throw new Error(`Signature does not match validator ${id}`);
      }

      return [signature];
    } catch (ex) {
      this.logger.info(`Validator ${id} at ${location} responded with error: ${ex.message}`);
    }

    return [];
  }

  private static async requestSignature(location: string, block: SignedBlock, timeout: number): Promise<string> {
    const sourceUrl = `${location}/signature`;

    try {
      const response = await axios.post(sourceUrl, JSON.stringify(block),{
        headers: {
          'Content-Type': 'application/json',
        },
        timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
        timeout,
      });

      return response.data.data;
    } catch (err) {
      if (err.response?.data) {
        throw new Error(err.response.data.error || err.response.data);
      }

      throw err;
    }
  }
}

export default SignatureCollector;
