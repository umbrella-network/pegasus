import Settings from '../types/Settings';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import path from 'path';
import axios from 'axios';
import fs from 'fs';

export type Manifest = {assets: Asset[]};

// TODO: add a simple checksum-based version control to manage selective downloads
// The current implementation will always re-download all files in the new manifest
export type Asset = {
  url: string;
  path: string;
};

@injectable()
export default class ApplicationUpdateService {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  async startUpdate(): Promise<void> {
    if (!this.settings.application.autoUpdate.enabled) return;

    const manifestUrl = this.settings.application.autoUpdate.url;

    if (!manifestUrl) {
      this.logger.debug('[ApplicationUpdateAgent] Skipping updates, no URL configured');
      return;
    }

    this.logger.info('[ApplicationUpdateAgent] Looking for updates...');
    this.logger.debug(`[ApplicationUpdateAgent] Manifest URL: ${manifestUrl}`);
    this.logger.debug(`[ApplicationUpdateAgent] Local Data Path: ${this.getDataPathPrefix()}`);

    let manifest: Manifest | undefined;

    try {
      manifest = await this.loadManifest(manifestUrl);

      if (!manifest) {
        this.logger.info('[ApplicationUpdateAgent] No manifest found');
        return;
      }
    } catch (e) {
      this.logger.error(`[ApplicationUpdateAgent] Manifest parsing error`);
      this.logger.debug(`[ApplicationUpdateAgent] Error: `, e);
      return;
    }

    try {
      await this.processManifest(manifest);
    } catch (e) {
      this.logger.error('[ApplicationManifestAgent] Manifest processing error');
      this.logger.debug('[ApplicationManifestAgent] Error: ', e);
    }
  }

  private async loadManifest(url: string): Promise<Manifest | undefined> {
    try {
      const response = await axios.get(url);

      if (![200, 201, 301].includes(response.status)) {
        this.logger.error(`[ApplicationUpdateAgent] Manifest Download Failed. HTTP Status: ${response.status}`);
        this.logger.debug(`[ApplicationUpdateAgent] HTTP Response: `, JSON.stringify(response));
        return;
      }

      return response.data;
    } catch (e) {
      this.logger.error(`[ApplicationUpdateAgent] Manifest Download Failed`);
      this.logger.debug(`[ApplicationUpdateAgent] Error: `, e);
      return;
    }
  }

  getDataPathPrefix(): string {
    return path.join(this.settings.application.root, './data');
  }

  private async processManifest(manifest: Manifest): Promise<void> {
    await Promise.all(manifest.assets.map((asset) => this.updateAsset(asset)));
  }

  private async updateAsset(asset: Asset): Promise<void> {
    const response = await axios.get(asset.url);

    if (![200, 201, 301].includes(response.status)) {
      this.logger.error(
        `[ApplicationUpdateAgent] Asset "${asset.url}" Download Failed. HTTP Status: ${response.status}`,
      );

      this.logger.debug(`[ApplicationUpdateAgent] HTTP Response: `, JSON.stringify(response));
      return;
    }

    const content = JSON.stringify(response.data);
    const fullLocalPath = path.join(this.getDataPathPrefix(), asset.path);
    await fs.promises.mkdir(path.dirname(fullLocalPath), {recursive: true});
    await fs.promises.writeFile(fullLocalPath, content);
  }
}
