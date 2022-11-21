import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';

import {Datum} from '../models/Datum';
import Settings from '../types/Settings';

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
