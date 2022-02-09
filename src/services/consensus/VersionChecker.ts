import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../../types/Settings';

@injectable()
export class VersionChecker {
  @inject('Logger')
  private logger!: Logger;

  @inject('Settings')
  private settings!: Settings;

  apply(version: string): void {
    const expected = this.settings.version.split('.');

    if (!version) {
      this.logger.warn('version check fail: no version');
      return;
    }

    const v = version.split('.');

    if (expected[0] !== v[0]) {
      this.logger.error(`version check fail: expected ${this.settings.version} got ${version}`);
    } else if (expected[1] !== v[1]) {
      this.logger.warn(`version check warn: ${this.settings.version} vs ${version}`);
    } else if (expected[2] !== v[2]) {
      this.logger.info(`version check: ${this.settings.version} vs ${version}`);
    }
  }
}
