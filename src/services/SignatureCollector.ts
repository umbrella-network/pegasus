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
    const otherValidators = validators.filter((v) => v.id !== this.blockchain.wallet.address);

    const collectedSignatures: (BlockSignerResponseWithPower | undefined)[] = await Promise.all(
      otherValidators.map((validator: Validator) => this.collectSignature(validator, block, affidavit)),
    );

    const signatures: BlockSignerResponseWithPower[] = [
      {
        signature: block.signature,
        power: validators.filter((v) => v.id === this.blockchain.wallet.address)[0].power,
        discrepancies: [],
        version: this.settings.version,
        validator: this.blockchain.wallet.address,
      },
    ];

    let emptyResponses = 0;

    collectedSignatures.forEach((data, i) => {
      data ? signatures.push({...data, validator: otherValidators[i].id}) : emptyResponses++;
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
      // if status check throws, requestSignature will be canceled
      const [blockSignerResponse] = await Promise.all([
        SignatureCollector.requestSignature(location, block, this.settings.signatureTimeout),
        SignatureCollector.statusCheck(location, this.settings.statusCheckTimeout),
      ]);

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
        timeoutErrorMessage: `Signature request timeout exceeded: ${sourceUrl}`,
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

  private static async statusCheck(location: string, timeout: number): Promise<void> {
    const sourceUrl = `${location}/info`;

    const response = await axios.get(sourceUrl, {
      timeoutErrorMessage: `Status check timeout exceeded: ${sourceUrl}`,
      timeout,
    });

    if (response.status !== 200) {
      throw Error(`Status check failed for validator at ${location}, HTTP: ${response.status}`);
    }

    const data = JSON.stringify(response.data).toLowerCase();
    const indexOf = data.indexOf('error');

    if (indexOf >= 0) {
      const error = data.slice(indexOf, indexOf + 25);
      throw Error(`Status check failed for validator at ${location}, error detected: ${error}`);
    }
  }
}

export default SignatureCollector;
