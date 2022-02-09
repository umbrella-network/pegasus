import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../../types/Settings';
import {BlockSignerResponseWithPower} from '../../types/BlockSignerResponse';
import {VersionChecker} from './VersionChecker';
import {ValidatorsResponses} from '../../types/ValidatorsResponses';
import {BigNumber} from 'ethers';

@injectable()
export class SimpleConsensusResolver {
  @inject('Logger')logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(VersionChecker) versionChecker!: VersionChecker;

  apply(blockSignerResponses: BlockSignerResponseWithPower[]): ValidatorsResponses {
    const signatures: string[] = [];
    const discrepantKeys: Set<string> = new Set();
    let powers: BigNumber = BigNumber.from(0);

    blockSignerResponses.forEach((response: BlockSignerResponseWithPower) => {
      this.versionChecker.apply(response.version);

      if (response.error) {
        this.logger.info(`Discarding ${response.validator} - the response contains an error: ${response.error}`);
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

      this.logger.info(
        `Discarding ${response.validator} - No valid signature. Discrepancies: ${discrepancies.length}.`,
      );

      discrepancies.forEach((discrepancy) => discrepantKeys.add(discrepancy.key));
      this.logger.debug(`${response.validator} Dump: ${JSON.stringify(response)}`);
    });

    return {signatures, discrepantKeys, powers};
  }
}
