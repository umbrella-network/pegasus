import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../../types/Settings';
import {VersionChecker} from './VersionChecker';
import {BlockSignerResponseWithPower} from '../../types/BlockSignerResponse';
import {ValidatorsResponses} from '../../types/ValidatorsResponses';
import {BigNumber} from 'ethers';
import {ConsensusOptimizer, ConsensusOptimizerProps} from '../ConsensusOptimizer';

@injectable()
export class OptimizedConsensusResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(VersionChecker) versionChecker!: VersionChecker;
  @inject(ConsensusOptimizer) consensusOptimizer!: ConsensusOptimizer;

  apply(blockSignerResponses: BlockSignerResponseWithPower[], requiredSignatures: number,): ValidatorsResponses {
    const signatures: string[] = [];
    let powers: BigNumber = BigNumber.from(0);

    const consensusOptimizerProps: ConsensusOptimizerProps = {
      participants: [],
      constraints: {
        minimumRequiredPower: 1n, // TODO: Remove minimum power logic
        minimumRequiredSignatures: Math.max(requiredSignatures - 1, 0),
      },
    };

    for (const response of blockSignerResponses) {
      if (!response.version) continue;

      this.versionChecker.apply(response.version);

      if (response.signature && response.validator && !response.error) {
        this.logger.info(`[OptimizedConsensusResolver] Adding ${response.validator} signature - ${response.signature}.`);
        signatures.push(response.signature);
        powers = powers.add(response.power);
      }

      if (!response.validator) {
        this.logger.info(`[OptimizedConsensusResolver] Validator lacks an address, skipping...`);
        continue;
      }

      if (response.error) {
        this.logger.info(`[OptimizedConsensusResolver] ${response.validator} - the response contains an error: ${response.error}`);
        this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
      }

      consensusOptimizerProps.participants.push({
        address: response.validator,
        power: response.power.toBigInt(),
        discrepancies: (response.discrepancies || []).map((d) => d.key),
      });
    }

    const discrepantKeys = this.consensusOptimizer.apply(consensusOptimizerProps) || new Set<string>();
    this.logger.info(`[OptimizedConsensusResolver] Discrepancies ${JSON.stringify(discrepantKeys)}`);
    return {signatures, discrepantKeys, powers};
  }
}