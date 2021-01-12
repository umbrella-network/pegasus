import {inject, injectable} from 'inversify';
import axios from 'axios';

import {SignedBlock} from '../types/SignedBlock';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Blockchain from '../lib/Blockchain';
import BlockMinter from './BlockMinter';
import {Logger} from 'winston';
import {Validator} from '../types/Validator';

@injectable()
class SignatureCollector {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ValidatorRegistryContract) validatorRegistryContract!: ValidatorRegistryContract;

  async apply(block: SignedBlock, affidavit: string): Promise<string[]> {
    const validators = await this.validatorRegistryContract.getValidators();

    const signatures = await Promise.all(validators.map((validator: Validator) => this.collectSignature(validator, block, affidavit)));

    return [...new Set(signatures.flat())];
  }

  private async collectSignature(validator: Validator, block: SignedBlock, affidavit: string): Promise<string[]> {
    const {id, location} = validator;

    if (id === this.blockchain.wallet.address) {
      return [block.signature];
    }

    try {
      const signature = await SignatureCollector.requestSignature(location, block);

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

  private static async requestSignature(location: string, block: SignedBlock): Promise<string> {
    const sourceUrl = `${location}/signature`;

    try {
      const response = await axios.post(sourceUrl, JSON.stringify(block),{
        headers: {
          'Content-Type': 'application/json',
        },
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
