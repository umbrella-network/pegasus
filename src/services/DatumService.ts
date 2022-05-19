import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {chunk} from 'lodash';

import Settings from '../types/Settings';
import {DatumRepository} from '../repositories/DatumRepository';
import {FeedDatum} from '../types/Datum';

@injectable()
export class DatumService {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(DatumRepository) datumRepository!: DatumRepository;

  async saveData(data: FeedDatum[]): Promise<void> {
    try {
      for (const batch of chunk(data, this.settings.mongodb.datumBatchSize)) {
        await this.datumRepository.saveBatch(batch);
      }
      this.logger.info('[DatumService] Data saved');
    } catch (e) {
      this.logger.error(`[DatumService] Error saving data, skipping...`);
      this.logger.error('[DatumService]', e);
    }
  }
}
