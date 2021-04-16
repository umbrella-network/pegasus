import {inject, injectable} from 'inversify';
import axios from 'axios';
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
    const collectedSignatures = await Promise.all(
      validators
        .filter((v) => v.id !== this.blockchain.wallet.address)
        .map((validator: Validator) => this.collectSignature(validator, block, affidavit)),
    );

    const signatures = [block.signature];
    signatures.push(...new Set(collectedSignatures.flat()));
    return signatures;
  }

  private async collectSignature(validator: Validator, block: SignedBlock, affidavit: string): Promise<string[]> {
    const {id, location} = validator;

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
      const response = await axios.post(sourceUrl, JSON.stringify(block), {
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
