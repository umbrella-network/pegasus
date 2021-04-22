import {inject, injectable} from 'inversify';
import axios from 'axios';
import {Logger} from 'winston';
import {BigNumber} from 'ethers';

import {SignedBlock} from '../types/SignedBlock';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';
import Settings from '../types/Settings';
import {BlockSignerResponse, BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {recoverSigner} from '../utils/mining';

@injectable()
class SignatureCollector {
  @inject('Logger') private logger!: Logger;
  @inject(Blockchain) private blockchain!: Blockchain;
  @inject('Settings') private settings!: Settings;

  async apply(block: SignedBlock, affidavit: string, validators: Validator[]): Promise<BlockSignerResponseWithPower[]> {
    const collectedSignatures: (BlockSignerResponseWithPower | undefined)[] = await Promise.all(
      validators
        .filter((v) => v.id !== this.blockchain.wallet.address)
        .map((validator: Validator) => this.collectSignature(validator, block, affidavit)),
    );

    const signatures: BlockSignerResponseWithPower[] = [
      {
        signature: block.signature,
        power: validators.filter((v) => v.id === this.blockchain.wallet.address)[0].power,
        discrepancies: [],
      },
    ];

    collectedSignatures.forEach((data) => {
      data && signatures.push(data);
    });

    return signatures;
  }

  private async collectSignature(
    validator: Validator,
    block: SignedBlock,
    affidavit: string,
  ): Promise<undefined | BlockSignerResponseWithPower> {
    const {id, location} = validator;

    try {
      const blockSignerResponse = await SignatureCollector.requestSignature(
        location,
        block,
        this.settings.signatureTimeout,
      );

      if (
        (blockSignerResponse.discrepancies.length > 0 || blockSignerResponse.error) &&
        !blockSignerResponse.signature
      ) {
        this.logger.info(`Validator ${id} at ${location} responded with error: ${blockSignerResponse.error}`);
        return {
          ...blockSignerResponse,
          power: BigNumber.from(0),
        };
      }

      const signerAddress = await recoverSigner(affidavit, blockSignerResponse.signature);

      if (signerAddress !== id) {
        throw new Error(`Signature does not match validator ${id}`);
      }

      return {
        ...blockSignerResponse,
        power: validator.power,
      };
    } catch (ex) {
      this.logger.info(`Validator ${id} at ${location} responded with error: ${ex.message}`);
    }
  }

  private static async requestSignature(
    location: string,
    block: SignedBlock,
    timeout: number,
  ): Promise<BlockSignerResponse> {
    const sourceUrl = `${location}/signature`;

    try {
      const response = await axios.post(sourceUrl, JSON.stringify(block), {
        headers: {
          'Content-Type': 'application/json',
        },
        timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
        timeout,
      });

      return response.data;
    } catch (err) {
      if (err.response?.data) {
        throw new Error(err.response.data.error || err.response.data);
      }

      throw err;
    }
  }
}

export default SignatureCollector;
