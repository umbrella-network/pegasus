import {inject, injectable} from 'inversify';
import axios from 'axios';
import {Logger} from 'winston';
import {Wallet} from 'ethers';

import {Validator} from '../../types/Validator';
import Settings from '../../types/Settings';
import {DeviationDataToSign, DeviationSignatures, DeviationSignerResponse} from '../../types/DeviationFeeds';
import {ValidatorStatusChecker} from '../ValidatorStatusChecker';
import {DeviationChainMetadata} from './DeviationChainMetadata';
import {DeviationHasher} from './DeviationHasher';
import {DeviationSignerRepository} from '../../repositories/DeviationSignerRepository';

@injectable()
export class DeviationSignatureCollector {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(DeviationHasher) protected deviationHasher!: DeviationHasher;
  @inject(DeviationSignerRepository) protected deviationSignerRepository!: DeviationSignerRepository;
  @inject(ValidatorStatusChecker) protected validatorStatusChecker!: ValidatorStatusChecker;
  @inject(DeviationChainMetadata) protected deviationChainMetadata!: DeviationChainMetadata;

  async apply(data: DeviationDataToSign, validators: Validator[]): Promise<DeviationSignerResponse[]> {
    const participants = validators.sort((a, b) => (a.id.toLowerCase() < b.id.toLowerCase() ? -1 : 1));

    return this.getSignatures(data, participants);
  }

  protected async getSignatures(
    data: DeviationDataToSign,
    participants: Validator[],
  ): Promise<DeviationSignerResponse[]> {
    const selfAddress = new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();

    const signedData = await Promise.all(
      participants.map((p) =>
        selfAddress == p.id.toLowerCase() ? this.getLocalSignature(data) : this.getParticipantSignature(data, p),
      ),
    );

    return signedData.filter((s: DeviationSignerResponse | undefined) => s !== undefined) as DeviationSignerResponse[];
  }

  protected async getLocalSignature(data: DeviationDataToSign): Promise<DeviationSignerResponse> {
    const signatures: DeviationSignatures = {};

    const chainMetadata = await this.deviationChainMetadata.apply(data.feedsForChain);

    const signaturesPerChain = await Promise.all(
      chainMetadata.map(([chainId, networkId, target]) => {
        const keys = data.feedsForChain[chainId];
        const priceDatas = keys.map((key) => data.proposedPriceData[key]);
        const hashOfData = this.deviationHasher.apply(chainId, networkId, target, keys, priceDatas);
        const deviationSigner = this.deviationSignerRepository.get(chainId);
        return deviationSigner.apply(hashOfData);
      }),
    );

    chainMetadata.forEach(([chainId], i) => {
      signatures[chainId] = signaturesPerChain[i];
    });

    return {
      signatures,
      discrepancies: [],
      version: this.settings.version,
    };
  }

  protected async getParticipantSignature(
    data: DeviationDataToSign,
    validator: Validator,
  ): Promise<DeviationSignerResponse | undefined> {
    try {
      const [response] = await Promise.all([
        this.requestSignature(data, validator, this.settings.signatureTimeout),
        this.validatorStatusChecker.apply(validator, this.settings.statusCheckTimeout),
      ]);

      this.logResponse(validator, response);

      return response;
    } catch (e) {
      this.logger.error(`[DeviationSignatureCollector] Signature collection failed for ${data.dataTimestamp}.`);
      this.logger.error(e);
    }

    return;
  }

  protected async requestSignature(
    data: DeviationDataToSign,
    validator: Validator,
    timeout: number,
  ): Promise<DeviationSignerResponse> {
    const sourceUrl = `${validator.location}/signature/deviation`;

    try {
      const response = await axios.post(sourceUrl, JSON.stringify(data), {
        headers: {'Content-Type': 'application/json'},
        timeoutErrorMessage: `Signature request timeout exceeded: ${sourceUrl}`,
        timeout,
      });

      return response.data;
    } catch (err) {
      if (err.response?.data) {
        throw new Error(`${validator.location}: (1) ${err.response.data.error || '-'} (2) ${err.response.data || '-'}`);
      }

      throw err;
    }
  }

  protected logResponse(validator: Validator, response: DeviationSignerResponse | undefined): void {
    if (!response) {
      return;
    }

    if (response.error) {
      this.logger.error(`${validator.location} respond with ${response.error}`);
    }

    if (response.discrepancies.length) {
      this.logger.warn(`${validator.location} respond with ${response.discrepancies.map((d) => d.key)} discrepancies`);
    }

    const signed = Object.keys(response?.signatures || {});

    if (signed.length) {
      this.logger.info(`${validator.location} sign for ${signed}`);
    }
  }
}
