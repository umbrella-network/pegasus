import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ConsensusOptimizer} from '../ConsensusOptimizer.js';
import Settings from '../../types/Settings.js';
import {DeviationSignerResponse} from '../../types/DeviationFeeds.js';
import {VersionChecker} from './VersionChecker.js';

@injectable()
export class DeviationSignerResponseProcessor {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(VersionChecker) protected versionChecker!: VersionChecker;
  @inject(ConsensusOptimizer) protected consensusOptimizer!: ConsensusOptimizer;

  apply(
    deviationSignerResponses: DeviationSignerResponse[],
    requiredSignatures: Record<string, number>,
  ): {signatures: Record<string, string[]>; discrepantKeys: Set<string>} {
    const signaturesPerChain: Record<string, string[]> = {};
    const discrepantKeys: Set<string> = new Set();

    deviationSignerResponses.forEach((response) => {
      const {signatures, version, error, discrepancies} = response;

      this.versionChecker.apply(version);

      discrepancies.forEach((discrepancy) => discrepantKeys.add(discrepancy.key));

      if (error) return;
      if (!signatures) return;

      const chains = Object.keys(signatures);
      if (chains.length === 0) return;

      // we do have signature(s)

      chains.forEach((chainId) => {
        if (!signaturesPerChain[chainId]) {
          signaturesPerChain[chainId] = [];
        }

        signaturesPerChain[chainId].push(signatures[chainId]);
      });
    });

    return {
      signatures: this.searchForConsensus(signaturesPerChain, requiredSignatures),
      discrepantKeys,
    };
  }

  protected searchForConsensus(
    signaturesPerChain: Record<string, string[]>,
    requiredSignatures: Record<string, number>,
  ): Record<string, string[]> {
    const consensuses: Record<string, string[]> = {};

    const chains = Object.keys(signaturesPerChain);

    chains.forEach((chainId) => {
      const gotSignatures = signaturesPerChain[chainId].length;
      if (!requiredSignatures[chainId]) {
        this.logger.error(`[${chainId}] requiredSignatures N/A`);
        return;
      }

      if (gotSignatures >= requiredSignatures[chainId]) {
        consensuses[chainId] = [...signaturesPerChain[chainId]];
        this.logger.info(`[${chainId}] got consensus for ${chainId} with ${gotSignatures} signatures`);
      } else {
        this.logger.warn(
          `[${chainId}] Not enough signatures: got ${gotSignatures}, required: ${requiredSignatures[chainId]}`,
        );
      }
    });

    return consensuses;
  }
}
