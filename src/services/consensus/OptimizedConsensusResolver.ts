import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {BigNumber} from 'ethers';
import {ConsensusOptimizer, ConsensusOptimizerProps} from '../ConsensusOptimizer.js';
import Settings from '../../types/Settings.js';
import {VersionChecker} from './VersionChecker.js';
import {BlockSignerResponseWithPower} from '../../types/BlockSignerResponse.js';
import {ValidatorsResponses} from '../../types/ValidatorsResponses.js';

@injectable()
export class OptimizedConsensusResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(VersionChecker) versionChecker!: VersionChecker;
  @inject(ConsensusOptimizer) consensusOptimizer!: ConsensusOptimizer;

  apply(blockSignerResponses: BlockSignerResponseWithPower[], requiredSignatures: number): ValidatorsResponses {
    const signatures: string[] = [];
    let powers: BigNumber = BigNumber.from(0);

    const consensusOptimizerProps: ConsensusOptimizerProps = {
      participants: [],
      constraints: {
        minimumRequiredPower: 1n, // TODO: Remove minimum power logic
        minimumRequiredSignatures: requiredSignatures,
      },
    };

    for (const response of blockSignerResponses) {
      if (!response?.version) continue;

      this.versionChecker.apply(response?.version);

      if (response.signature && response.validator && !response.error) {
        this.logger.info(
          `[OptimizedConsensusResolver] Adding ${response.validator} with signature: ${response.signature}.`,
        );

        signatures.push(response.signature);
        powers = powers.add(response.power);
      }

      if (!response.validator) {
        this.logger.error('[OptimizedConsensusResolver] Validator lacks an address, skipping');
        continue;
      }

      if (response.error) {
        this.logger.error(
          `[OptimizedConsensusResolver] ${response.validator} - ` + `the response contains an error: ${response.error}`,
        );
        this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
      }

      consensusOptimizerProps.participants.push({
        address: response.validator,
        power: response.power?.toBigInt() || 0n,
        discrepancies: (response.discrepancies || []).map((d) => d.key),
      });
    }

    const discrepantKeys = this.consensusOptimizer.apply(consensusOptimizerProps) || new Set<string>();
    this.logger.debug(`[OptimizedConsensusResolver] Discrepancies ${JSON.stringify(discrepantKeys)}`);
    return {signatures, discrepantKeys, powers};
  }
}
