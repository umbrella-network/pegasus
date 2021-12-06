import {inject, injectable} from 'inversify';
import axios from 'axios';
import {Logger} from 'winston';
import newrelic from 'newrelic';
import {SignedBlock} from '../types/SignedBlock';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';
import Settings from '../types/Settings';
import {BlockSignerResponse, BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {recoverSigner} from '../utils/mining';
import {SignatureCollectionErrorEvent} from '../constants/ReportedMetricsEvents';
import {Error} from 'mongoose';

@injectable()
class SignatureCollector {
  @inject('Logger') private logger!: Logger;
  @inject(Blockchain) private blockchain!: Blockchain;
  @inject('Settings') private settings!: Settings;

  async apply(block: SignedBlock, affidavit: string, validators: Validator[]): Promise<BlockSignerResponseWithPower[]> {
    const self = <Validator>validators.find((v) => v.id === this.blockchain.wallet.address);
    const participants = validators.filter((v) => v.id !== this.blockchain.wallet.address);

    const signatures = [
      this.getLocalSignature(block, self),
      await this.getParticipantSignatures(block, participants, affidavit),
    ].flat();

    return signatures;
  }

  private getLocalSignature(block: SignedBlock, self: Validator): BlockSignerResponseWithPower {
    return {
      validator: this.blockchain.wallet.address,
      signature: block.signature,
      power: self.power,
      discrepancies: [],
      version: this.settings.version,
    };
  }

  private async getParticipantSignatures(
    block: SignedBlock,
    participants: Validator[],
    affidavit: string,
  ): Promise<BlockSignerResponseWithPower[]> {
    const signaturePickups = participants.map((p) => this.getParticipantSignature(block, p, affidavit));
    const successfulPickups = (await Promise.all(signaturePickups)).filter((s) => s !== undefined);
    this.logger.info(`Got ${successfulPickups.length} / ${signaturePickups.length} responses.`);
    return <BlockSignerResponseWithPower[]>successfulPickups;
  }

  private async getParticipantSignature(
    block: SignedBlock,
    validator: Validator,
    affidavit: string,
  ): Promise<BlockSignerResponseWithPower | undefined> {
    const timeout = this.settings.signatureTimeout;

    try {
      const [blockSignerResponse] = await Promise.all([
        this.requestSignature(block, validator, timeout),
        this.statusCheck(validator, timeout),
      ]);

      if (this.isBlockSignerResponseValid(blockSignerResponse)) {
        // TODO: reconsider if this is necessary since the smart contract already prevents this.
        this.checkSignature(validator, <string>blockSignerResponse.signature, affidavit);
        return {...blockSignerResponse, validator: validator.id, power: validator.power};
      } else {
        this.logBadSignatureCollection(validator, blockSignerResponse);
        return {...blockSignerResponse, validator: validator.id, power: validator.power, signature: undefined};
      }
    } catch (e) {
      this.logSignatureCollectionException(validator, e);
    }

    return;
  }

  private async statusCheck(validator: Validator, timeout: number): Promise<void> {
    const sourceUrl = `${validator.location}/info`;

    const response = await axios.get(sourceUrl, {
      timeoutErrorMessage: `Status check timeout exceeded: ${sourceUrl}`,
      timeout,
    });

    if (response.status !== 200) {
      throw new Error(`Status check failed for validator at ${validator.location}, HTTP: ${response.status}`);
    }

    const data = JSON.stringify(response.data).toLowerCase();
    const indexOf = data.indexOf('error');

    if (indexOf >= 0) {
      const error = data.slice(indexOf, indexOf + 25);
      throw new Error(`Status check failed for validator at ${validator.location}, error detected: ${error}`);
    }
  }

  private async requestSignature(
    block: SignedBlock,
    validator: Validator,
    timeout: number,
  ): Promise<BlockSignerResponse> {
    const sourceUrl = `${validator.location}/signature`;

    try {
      const response = await axios.post(sourceUrl, JSON.stringify(block), {
        headers: {'Content-Type': 'application/json'},
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

  private logBadSignatureCollection(validator: Validator, blockSignerResponse: BlockSignerResponse): void {
    const errMsg = blockSignerResponse.error || `${blockSignerResponse.discrepancies.length} discrepancies`;

    newrelic.recordCustomEvent(SignatureCollectionErrorEvent, {
      validatorId: validator.id,
      location: validator.location,
      error: errMsg,
    });

    this.logger.error(`Validator ${validator.id} at ${validator.location} responded with error: ${errMsg}`);
  }

  private logSignatureCollectionException(validator: Validator, error: Error): void {
    newrelic.recordCustomEvent(SignatureCollectionErrorEvent, {
      validatorId: validator.id,
      location: validator.location,
      error: error.message,
    });

    this.logger.error(`Can not collect signature at ${validator.location}, exception: ${error.message}`);
  }

  private isBlockSignerResponseValid(blockSignerResponse: BlockSignerResponse): boolean {
    if (blockSignerResponse.error) return false;
    if (blockSignerResponse.discrepancies.length > 0) return false;
    return !!blockSignerResponse.signature;
  }

  private checkSignature(validator: Validator, signature: string, affidavit: string): void {
    const signerAddress = recoverSigner(affidavit, signature);

    if (signerAddress !== validator.id) {
      throw new Error(`Signature does not match validator ${validator.id}`);
    }
  }
}

export default SignatureCollector;
