import {inject, injectable} from 'inversify';
import axios from 'axios';
import {Logger} from 'winston';
import {Wallet} from 'ethers';

import {SignedBlock} from '../types/SignedBlock';
import {Validator} from '../types/Validator';
import Settings from '../types/Settings';
import {BlockSignerResponse, BlockSignerResponseWithPower} from '../types/BlockSignerResponse';
import {recoverSigner} from '../utils/mining';
import {ValidatorStatusChecker} from './ValidatorStatusChecker';

@injectable()
class SignatureCollector {
  @inject('Logger') private logger!: Logger;
  @inject(ValidatorStatusChecker) private validatorStatusChecker!: ValidatorStatusChecker;
  @inject('Settings') private settings!: Settings;

  async apply(block: SignedBlock, affidavit: string, validators: Validator[]): Promise<BlockSignerResponseWithPower[]> {
    const selfAddress = new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();
    const self = <Validator>validators.find((v) => v.id.toLowerCase() === selfAddress.toLowerCase());
    const participants = validators.filter((v) => v.id.toLowerCase() !== selfAddress.toLowerCase());

    return [this.getLocalSignature(block, self), await this.getParticipantSignatures(block, participants, affidavit)]
      .flat()
      .filter((s) => !!s);
  }

  private getLocalSignature(block: SignedBlock, self: Validator): BlockSignerResponseWithPower {
    return {
      validator: self.id,
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
    const blockSignerResponses = await Promise.all(signaturePickups);
    const unsignedResponses = blockSignerResponses.filter((s) => !s?.signature);

    this.logger.info(
      `[SignatureCollector] Got ${blockSignerResponses.length} responses, ${unsignedResponses.length} unsigned`,
    );

    return <BlockSignerResponseWithPower[]>blockSignerResponses;
  }

  private async getParticipantSignature(
    block: SignedBlock,
    validator: Validator,
    affidavit: string,
  ): Promise<BlockSignerResponseWithPower | undefined> {
    try {
      const [response] = await Promise.all([
        this.requestSignature(block, validator, this.settings.signatureTimeout),
        this.validatorStatusChecker.apply(validator, this.settings.statusCheckTimeout),
      ]);

      if (this.isBlockSignerResponseValid(response)) {
        // TODO: reconsider if this is necessary since the smart contract already prevents this.
        this.checkSignature(validator, <string>response.signature, affidavit);
        return {...response, validator: validator.id, power: validator.power};
      } else if (!response.error) {
        this.logBadSignatureCollection(validator, response);
        return {...response, validator: validator.id, power: validator.power, signature: undefined};
      } else {
        this.logBadSignatureCollection(validator, response);
      }
    } catch (e) {
      this.logger.error('[SignatureCollector] Signature collection failed.');
      this.logSignatureCollectionException(validator, e);
    }

    return;
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
    const errMsg = blockSignerResponse.error
      ? `ERROR: ${blockSignerResponse.error}`
      : `${blockSignerResponse.discrepancies.length} discrepancies`;

    this.logger.warn(
      `[SignatureCollector] Validator ${validator.id} at ${validator.location} responded with: ${errMsg}`,
    );
  }

  private logSignatureCollectionException(validator: Validator, error: Error): void {
    this.logger.error(
      `[SignatureCollector] Can not collect signature at ${validator.location}, exception: ${error.message}`,
    );
  }

  private isBlockSignerResponseValid(blockSignerResponse: BlockSignerResponse): boolean {
    if (blockSignerResponse.error) return false;
    if (blockSignerResponse.discrepancies.length > 0) return false;
    return !!blockSignerResponse.signature;
  }

  private checkSignature(validator: Validator, signature: string, affidavit: string): void {
    const signerAddress = recoverSigner(affidavit, signature);

    if (signerAddress.toLowerCase() !== validator.id.toLowerCase()) {
      throw new Error(`Signature does not match validator ${validator.id}`);
    }
  }
}

export default SignatureCollector;
