import Settings from '../types/Settings';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import path from 'path';
import axios from 'axios';
import fs from 'fs';

export type Manifest = {
  timestamp: Date;
  assets: Asset[];
};

export type Asset = {
  url: string;
  path: string;
};

@injectable()
export default class ApplicationUpdateService {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  currentManifest?: Manifest;

  private readonly SUCCESS_CODES = [200, 201, 301];

  async startUpdate(): Promise<void> {
    if (!this.settings.application.autoUpdate.enabled) return;

    const manifestUrl = this.settings.application.autoUpdate.url;

    if (!manifestUrl) {
      this.logger.info('[ApplicationUpdateService] Skipping updates, no URL configured');
      return;
    }

    this.logger.info('[ApplicationUpdateService] Looking for updates...');
    this.logger.debug(`[ApplicationUpdateService] Manifest URL: ${manifestUrl}`);
    this.logger.debug(`[ApplicationUpdateService] Local Data Path: ${this.getDataPathPrefix()}`);

    const manifest = await this.getLatestManifest(manifestUrl);
    if (!manifest) return;

    try {
      await this.processManifest(manifest);
      this.currentManifest = manifest;
      this.logger.info('[ApplicationUpdateService] Update complete.');
    } catch (e) {
      this.logger.error('[ApplicationUpdateService] Manifest processing error');
      this.logger.debug('[ApplicationUpdateService] Error: ', e);
    }
  }

  private async getLatestManifest(url: string): Promise<Manifest | undefined> {
    try {
      const manifest = await this.downloadManifest(url);

      if (!manifest) {
        this.logger.info('[ApplicationUpdateService] No manifest found');
        return;
      }

      if (manifest.timestamp == this.currentManifest?.timestamp) {
        this.logger.info('[ApplicationUpdateService] No new update manifest found, skipping download.');
        return;
      }

      return manifest;
    } catch (e) {
      this.logger.error('[ApplicationUpdateService] Manifest parsing error');
      this.logger.debug('[ApplicationUpdateService] Error: ', e);
      return;
    }
  }

  private async downloadManifest(url: string): Promise<Manifest | undefined> {
    try {
      const response = await axios.get(url);

      if (!this.SUCCESS_CODES.includes(response.status)) {
        this.logger.error(`[ApplicationUpdateService] Manifest Download Failed. HTTP Status: ${response.status}`);
        this.logger.debug('[ApplicationUpdateService] HTTP Response: ', JSON.stringify(response));
        return;
      }

      return response.data;
    } catch (e) {
      this.logger.error('[ApplicationUpdateService] Manifest Download Failed');
      this.logger.debug('[ApplicationUpdateService] Error: ', e);
      return;
    }
  }

  private getDataPathPrefix(): string {
    return path.join(this.settings.application.root, './data');
  }

  private async processManifest(manifest: Manifest): Promise<void> {
    await Promise.all(manifest.assets.map((asset) => this.updateAsset(asset)));
  }

  private async updateAsset(asset: Asset): Promise<void> {
    this.logger.debug(`[ApplicationUpdateService] Updating asset: ${JSON.stringify(asset)}`);
    const response = await axios.get(asset.url);

    if (![200, 201, 301].includes(response.status)) {
      this.logger.error(
        `[ApplicationUpdateService] Asset "${asset.url}" Download Failed. HTTP Status: ${response.status}`,
      );

      this.logger.debug('[ApplicationUpdateService] HTTP Response: ', JSON.stringify(response));
      return;
    }

    const content = JSON.stringify(response.data);
    const fullLocalPath = path.join(this.getDataPathPrefix(), asset.path);
    await fs.promises.mkdir(path.dirname(fullLocalPath), {recursive: true});
    await fs.promises.writeFile(fullLocalPath, content);
  }
}
