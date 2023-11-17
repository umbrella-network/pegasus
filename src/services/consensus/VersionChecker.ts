import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../../types/Settings.js';

@injectable()
export class VersionChecker {
  @inject('Logger')
  private logger!: Logger;

  @inject('Settings')
  private settings!: Settings;

  apply(version: string | undefined): void {
    if (!version) {
      this.logger.warn('version check fail: no version');
      return;
    }

    const expected = this.settings.version?.split('.');
    if (!expected) return;

    const v = version.split('.').map((s) => parseInt(s));

    const myVersion = expected.map((s) => parseInt(s));

    if (myVersion[0] < v[0]) {
      this.logger.error(`version check: expected ${version} got ${this.settings.version}, please update!`);
    } else if (myVersion[1] < v[1]) {
      this.logger.info(`new version detected: ${version}, got ${this.settings.version}, consider updating`);
    } else if (myVersion[2] < v[2]) {
      this.logger.debug(`new version detected: ${version}`);
    }
  }
}
