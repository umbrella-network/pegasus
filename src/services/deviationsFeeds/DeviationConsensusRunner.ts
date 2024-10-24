import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {Validator} from '../../types/Validator.js';
import {DeviationDataToSign} from '../../types/DeviationFeeds.js';
import {DeviationSignatureCollector} from './DeviationSignatureCollector.js';
import {DeviationDataToSignFilter} from './DeviationDataToSignFilter.js';
import {DeviationSignerResponseProcessor} from '../consensus/DeviationSignerResponseProcessor.js';
import {DeviationConsensusFactory} from '../../factories/DeviationConsensusFactory.js';
import {DeviationConsensus} from '../../models/DeviationConsensus.js';

@injectable()
export class DeviationConsensusRunner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(DeviationSignatureCollector) signatureCollector!: DeviationSignatureCollector;
  @inject(DeviationSignerResponseProcessor) signerResponseProcessor!: DeviationSignerResponseProcessor;

  async apply(
    dataForConsensus: DeviationDataToSign,
    validators: Validator[],
    requiredSignatures: Record<string, number>,
  ): Promise<DeviationConsensus[] | null> {
    const maxLeafKeyCount = Object.keys(dataForConsensus.leaves).length;
    const maxRetries = this.settings.consensus.retries;

    for (let i = 1; i <= maxRetries; i++) {
      this.logger.info(`[DCR] Starting Round ${i}.`);

      const {consensuses, discrepantKeys} = await this.runConsensus(dataForConsensus, validators, requiredSignatures);
      const leafKeyCount = Object.keys(dataForConsensus.leaves).length;
      const discrepantCount = discrepantKeys.size;

      const logProps = {
        maxRounds: maxRetries,
        leafKeyCount,
        maxLeafKeyCount,
        discrepantCount,
        round: i,
      };

      this.logConsensusResult({...logProps, consensuses});

      if (consensuses.length) {
        // if we have even one consensus, we finish
        return consensuses;
      }

      if (i < maxRetries && discrepantKeys.size > 0) {
        this.logger.warn(
          `[DCR] Dumping discrepancy data (${discrepantCount}): ` + `${Array.from(discrepantKeys).join(', ')}`,
        );

        dataForConsensus = DeviationDataToSignFilter.apply(dataForConsensus, discrepantKeys);
      }
    }

    return null;
  }

  protected async runConsensus(
    dataForConsensus: DeviationDataToSign,
    validators: Validator[],
    requiredSignatures: Record<string, number>,
  ): Promise<{consensuses: DeviationConsensus[]; discrepantKeys: Set<string>}> {
    const {dataTimestamp, leaves} = dataForConsensus;

    this.logger.info(
      `[DCR] consensus at ${dataTimestamp} with ${validators.length} validators, ${Object.keys(leaves).length} leaves`,
    );

    const deviationSignerResponses = await this.signatureCollector.apply(dataForConsensus, validators);

    const {signatures: signaturesPerChain, discrepantKeys} = this.signerResponseProcessor.apply(
      deviationSignerResponses,
      requiredSignatures,
    );

    const consensuses = DeviationConsensusFactory.create(dataForConsensus, signaturesPerChain);

    return {
      consensuses,
      discrepantKeys,
    };
  }

  protected logConsensusResult(props: {
    maxRounds: number;
    consensuses: DeviationConsensus[];
    leafKeyCount: number;
    maxLeafKeyCount: number;
    discrepantCount: number;
    round: number;
  }): void {
    const {leafKeyCount, maxLeafKeyCount, consensuses} = props;
    if (consensuses.length == 0) {
      this.logger.warn(`[DCR] Round ${props.round}/${props.maxRounds} - no consensus`);
      return;
    }

    const consensusYield = maxLeafKeyCount == 0 ? 0.0 : Math.round((leafKeyCount * 1000) / maxLeafKeyCount) / 1000;

    const msg = [
      `[DCR] Round ${props.round}/${props.maxRounds} Finished.`,
      `Consensus for: ${consensuses.map((c) => c.chainId)}`,
      `| Keys: ${leafKeyCount}`,
      `| Missed: ${props.discrepantCount}`,
      `| Yield: ${consensusYield * 100}%`,
    ].join(' ');

    this.logger.info(msg);
  }
}
