import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {Downloader} from './Downloader.js';
import Settings from '../../types/Settings.js';

export type ReleasesData = {
  leaderSelectorV2: boolean;
};

@injectable()
export class ReleasesResolver {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(MappingRepository) mappingRepository!: MappingRepository;
  @inject(Downloader) downloader!: Downloader;

  readonly RELEASE_PREFIX = 'RELEASE_';
  private readonly logPrefix = '[Releases]';

  async update(): Promise<void> {
    const url = this.settings.application.autoUpdate.releasesUrl;
    if (!url) throw new Error(`${this.logPrefix} empty URL`);

    const data = await this.downloader.apply<ReleasesData>(url);
    if (data === undefined) throw new Error(`${this.logPrefix} empty data at ${url}`);

    await this.mappingRepository.setMany([this.parseData(data, 'leaderSelectorV2')]);
  }

  async active(key: keyof ReleasesData): Promise<boolean> {
    const data = await this.mappingRepository.get(`${this.RELEASE_PREFIX}${key}`);
    return data === undefined || data === '1';
  }

  protected parseData(data: ReleasesData, key: keyof ReleasesData): {_id: string; value: string} {
    const value = data?.[key] === undefined ? '1' : data?.[key] ? '1' : '0';
    return {_id: `${this.RELEASE_PREFIX}${key}`, value};
  }
}
