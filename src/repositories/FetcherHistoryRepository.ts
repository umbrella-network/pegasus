import {inject, injectable} from 'inversify';
import dayjs from 'dayjs';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {FetcherHistory} from '../models/FetcherHistory.js';
import {FetcherHistoryInterface} from '../types/fetchers.js';

@injectable()
export class FetcherHistoryRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') private logger!: Logger;

  async save(data: FetcherHistoryInterface): Promise<void> {
    const expireAt = dayjs().add(this.settings.fetcherHistory.ttl, 'second').toDate();
    const doc = await getModelForClass(FetcherHistory).create({...data, expireAt});
    await doc.save();
  }

  async latest(limit = 150): Promise<FetcherHistoryInterface[]> {
    return getModelForClass(FetcherHistory).find().sort({timestamp: -1}).limit(limit).exec();
  }

  async saveMany(data: FetcherHistoryInterface[]): Promise<void> {
    const expireAt = dayjs().add(this.settings.fetcherHistory.ttl, 'second').toDate();

    this.logger.info(JSON.stringify(data));

    try {
      await getModelForClass(FetcherHistory).bulkWrite(
        data.map((p) => {
          return {insertOne: {...p, expireAt}};
        }),
        { ordered : false }
      );

      this.logger.info(`[FetcherHistoryRepository] saved ${data.length} records`);
      this.logger.info(`[FetcherHistoryRepository] ${data.map((d) => `${d.fetcher}@${d.symbol}`).join(', ')}`);
    } catch (e: unknown) {
      this.logger.error(`[FetcherHistoryRepository] ${(e as Error).message}`);
    }
  }
}
