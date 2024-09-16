import {inject, injectable} from 'inversify';
import axios, {AxiosError} from 'axios';
import {Logger} from 'winston';
import {Wallet} from 'ethers';

import {Validator} from '../../types/Validator.js';
import Settings from '../../types/Settings.js';
import {DeviationDataToSign, DeviationSignatures, DeviationSignerResponse} from '../../types/DeviationFeeds.js';
import {ValidatorStatusChecker} from '../ValidatorStatusChecker.js';
import {DeviationChainMetadata} from './DeviationChainMetadata.js';
import {DeviationHasher} from './DeviationHasher.js';
import {DeviationSignerRepository} from '../../repositories/DeviationSignerRepository.js';
import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import {DataCollection} from '../../types/custom.js';
import {sortValidators} from '../../utils/sortValidators.js';

@injectable()
export class DeviationSignatureCollector {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(DeviationHasher) protected deviationHasher!: DeviationHasher;
  @inject(DeviationSignerRepository) protected deviationSignerRepository!: DeviationSignerRepository;
  @inject(ValidatorStatusChecker) protected validatorStatusChecker!: ValidatorStatusChecker;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;
  @inject(DeviationChainMetadata) protected deviationChainMetadata!: DeviationChainMetadata;

  async apply(data: DeviationDataToSign, validators: Validator[]): Promise<DeviationSignerResponse[]> {
    const participants = sortValidators(validators);

    return this.getSignatures(data, participants);
  }

  protected async getSignatures(
    data: DeviationDataToSign,
    participants: Validator[],
  ): Promise<DeviationSignerResponse[]> {
    const selfAddress = new Wallet(this.settings.blockchain.wallets.evm.privateKey).address.toLowerCase();
    const knownValidators = await this.validatorRepository.getAll();

    this.logger.debug(`participants: ${JSON.stringify(participants)}`);

    const signedData = await Promise.all(
      participants.map((p) =>
        selfAddress == p.id.toLowerCase()
          ? this.getLocalSignature(data, p, knownValidators)
          : this.getParticipantSignature(data, p, knownValidators),
      ),
    );

    return signedData.filter((s: DeviationSignerResponse | undefined) => s !== undefined) as DeviationSignerResponse[];
  }

  protected async getLocalSignature(
    data: DeviationDataToSign,
    validator: Validator,
    knownValidators: DataCollection<Set<string>>,
  ): Promise<DeviationSignerResponse> {
    const signatures: DeviationSignatures = {};

    const chainMetadata = await this.deviationChainMetadata.apply(data.feedsForChain);

    const signaturesPerChain = await Promise.all(
      chainMetadata.map(([chainId, networkId, target]) => {
        if (!this.validatorExistInBank(validator, knownValidators[chainId])) {
          this.logger.warn(`[DeviationSignatureCollector] not signing for ${chainId}, I'm not in Bank`);
          return '';
        }

        const keys = data.feedsForChain[chainId];
        const priceDatas = keys.map((key) => data.proposedPriceData[key]);
        const hashOfData = this.deviationHasher.apply(chainId, networkId, target, keys, priceDatas);
        const deviationSigner = this.deviationSignerRepository.get(chainId);
        return deviationSigner.apply(hashOfData);
      }),
    );

    chainMetadata.forEach(([chainId], i) => {
      if (signaturesPerChain[i].length > 0) {
        signatures[chainId] = signaturesPerChain[i];
      }
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
    knownValidators: DataCollection<Set<string>>,
  ): Promise<DeviationSignerResponse | undefined> {
    try {
      const [response] = await Promise.all([
        this.requestSignature(data, validator, this.settings.signatureTimeout),
        this.validatorStatusChecker.apply(validator, this.settings.statusCheckTimeout),
      ]);

      this.logResponse(validator, response);

      if (response.signatures) {
        Object.keys(response.signatures).forEach((chainId) => {
          if (response.signatures && !this.validatorExistInBank(validator, knownValidators[chainId])) {
            this.logger.warn(`[DeviationSignatureCollector] removing ${chainId} signature for ${validator.location}`);
            delete response.signatures[chainId];
          }
        });
      }

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
    } catch (err: unknown) {
      if ((err as AxiosError).response?.data) {
        throw new Error(
          `${validator.location}: (1) ${(err as AxiosError).response?.data.error || '-'} ` +
            `(2) ${(err as AxiosError).response?.data || '-'}`,
        );
      }

      throw err;
    }
  }

  // we're only checking existance if `chainValidators` is not empty set, otherwise we return TRUE
  protected validatorExistInBank(validator: Validator, chainValidators: Set<string>): boolean {
    const location = validator.location.endsWith('/') ? validator.location.slice(0, -1) : validator.location;
    return chainValidators.size == 0 || chainValidators.has(location);
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
