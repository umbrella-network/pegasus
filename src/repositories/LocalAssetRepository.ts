import {inject, injectable} from 'inversify';
import Settings from '../types/Settings.js';
import path from 'path';
import fs from 'fs';
import {Logger} from 'winston';

@injectable()
export class LocalAssetRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  async read(relativePath: string): Promise<string | undefined> {
    try {
      const fullPath = this.getPath(relativePath);
      this.logger.debug(`[LocalAssetRepository] Loading ${fullPath}`);
      return await fs.promises.readFile(fullPath, 'utf8');
    } catch (e) {
      this.logger.error(`[LocalAssetRepository] File ${relativePath} not found locally`);
      return;
    }
  }

  private getPath(relativePath: string): string {
    return path.join(this.settings.application.root, 'data', relativePath);
  }
}
