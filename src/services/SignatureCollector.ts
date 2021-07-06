import {inject, injectable} from 'inversify';
import axios from 'axios';
import {Logger} from 'winston';
import {BigNumber} from 'ethers';
import newrelic from 'newrelic';

import {SignedBlock} from '../types/SignedBlock';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';
import Settings from '../types/Settings';
import {BlockSignerResponse, BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {recoverSigner} from '../utils/mining';
import {SignatureCollectionErrorEvent} from '../constants/ReportedMetricsEvents';

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
        version: this.settings.version,
      },
    ];

    let emptyResponses = 0;

    collectedSignatures.forEach((data) => {
      data ? signatures.push(data) : emptyResponses++;
    });

    if (emptyResponses) {
      this.logger.warn(`collected ${emptyResponses} empty (not compatible) responses`);
    }

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
        const errMsg = blockSignerResponse.error || `${blockSignerResponse.discrepancies.length} discrepancies`;

        newrelic.recordCustomEvent(SignatureCollectionErrorEvent, {
          validatorId: id,
          location: location,
          error: errMsg,
        });
        this.logger.error(`Validator ${id} at ${location} responded with error: ${errMsg}`);
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
      newrelic.recordCustomEvent(SignatureCollectionErrorEvent, {
        validatorId: id,
        location: location,
        error: ex.message,
      });
      this.logger.error(`Can not collect signature at ${location}, error: ${ex.message}`);
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
