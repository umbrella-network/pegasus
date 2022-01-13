import Settings from '../types/Settings';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

@injectable()
export default class ApplicationUpdateCoordinator {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  async startUpdate(): Promise<void> {
    // load an update manifest. If it's a file URL, copy locally; else, download via HTTPS
    // download updated files to a local data directory
    // if the manifest file URL
  }
}
