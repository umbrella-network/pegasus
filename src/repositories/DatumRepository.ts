import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';
import {chunk} from 'lodash';
import {Logger} from 'winston';

import {Datum} from '../models/Datum';
import Settings from '../types/Settings';
import {FeedDatum} from 'src/types/Datum';

export type SaveDatumProps = {
  source: string;
  symbol: string;
  value: string;
  timestamp: Date;
  expireAt?: Date;
  type?: string;
};

@injectable()
export class DatumRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  async saveData(data: FeedDatum[]): Promise<void> {
    try {
      for (const batch of chunk(data, this.settings.mongodb.datumBatchSize)) {
        await this.saveBatch(batch);
      }
      this.logger.info('[DatumService] Data saved');
    } catch (e) {
      this.logger.error(`[DatumService] Error saving data, skipping...`);
      this.logger.error('[DatumService]', e);
    }
  }

  async saveBatch(props: SaveDatumProps[]): Promise<void> {
    const operations = [];

    for (const datumProp of props) {
      const {source, symbol, value, timestamp} = datumProp;
      const expireAt = datumProp.expireAt || dayjs().add(this.settings.mongodb.indexTTL.datumTTL, 'second').toDate();

      operations.push({
        updateOne: {
          filter: {source, symbol, timestamp},
          update: {source, symbol, timestamp, value, expireAt},
          upsert: true,
          new: true,
        },
      });
    }

    await getModelForClass(Datum).bulkWrite(operations);
  }
}
