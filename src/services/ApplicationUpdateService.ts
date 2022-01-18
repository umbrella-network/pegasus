import Settings from '../types/Settings';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import path from 'path';
import axios from 'axios';

export type Manifest = {assets: Asset[]};

export type Asset = {
  remoteUrl: string;
  localPath: string;
};

@injectable()
export default class ApplicationUpdateService {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  async startUpdate(): Promise<void> {
    const manifestUrl = this.settings.application.autoUpdate.url;

    if (!manifestUrl) {
      this.logger.debug('[ApplicationUpdateAgent] Skipping updates, no URL configured');
      return;
    }

    this.logger.info('[ApplicationUpdateAgent] Looking for updates...');
    this.logger.debug(`[ApplicationUpdateAgent] Manifest URL: ${manifestUrl}`);
    this.logger.debug(`[ApplicationUpdateAgent] Local Data Path: ${this.getDataPath()}`);

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

  getDataPath(): string {
    return path.join(this.settings.application.root, './data');
  }

  private async processManifest(manifest: Manifest): Promise<void> {
    await Promise.all(manifest.assets.map((asset) => this.updateAsset(asset)));
  }

  private async updateAsset(asset: Asset): Promise<void> {
    const response = await axios.get(asset.remoteUrl);

    if (![200, 201, 301].includes(response.status)) {
      this.logger.error(
        `[ApplicationUpdateAgent] Asset "${asset.remoteUrl}" Download Failed. HTTP Status: ${response.status}`,
      );

      this.logger.debug(`[ApplicationUpdateAgent] HTTP Response: `, JSON.stringify(response));
      return;
    }

    // TODO
    // const content = <string>response.data;
    // const fullLocalPath = path.join(this.getDataPath(), asset.localPath);
  }
}
