import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../../types/Settings.js';
import {BlockSignerResponseWithPower} from '../../types/BlockSignerResponse.js';
import {VersionChecker} from './VersionChecker.js';
import {ValidatorsResponses} from '../../types/ValidatorsResponses.js';
import {BigNumber} from 'ethers';

@injectable()
export class SimpleConsensusResolver {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(VersionChecker) versionChecker!: VersionChecker;

  apply(blockSignerResponses: BlockSignerResponseWithPower[]): ValidatorsResponses {
    const signatures: string[] = [];
    const discrepantKeys: Set<string> = new Set();
    let powers: BigNumber = BigNumber.from(0);

    blockSignerResponses.forEach((response: BlockSignerResponseWithPower) => {
      if (!response.version) return;

      this.versionChecker.apply(response.version);

      if (response.error) {
        this.logger.error(`Discarding ${response.validator} - the response contains an error: ${response.error}`);
        this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
        return;
      }

      if (response.signature) {
        this.logger.info(`Adding ${response.validator} signature - ${response.signature}`);
        signatures.push(response.signature);
        powers = powers.add(response.power);
        return;
      }

      const discrepancies = response.discrepancies || [];

      if (discrepancies.length > this.settings.consensus.discrepancyCutoff) {
        this.logger.warn(`Validator ${response.validator} ignored because of ${discrepancies.length} discrepancies`);
        return;
      }

      this.logger.warn(
        `Discarding ${response.validator} - No valid signature. Discrepancies: ${discrepancies.length}.`,
      );

      discrepancies.forEach((discrepancy) => discrepantKeys.add(discrepancy.key));
      this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
    });

    return {signatures, discrepantKeys, powers};
  }
}
