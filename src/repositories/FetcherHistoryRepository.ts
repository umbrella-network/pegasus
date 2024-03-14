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

  async latestSymbol(symbol: string, options?: {limit?: number, asc: boolean}): Promise<FetcherHistoryInterface[]> {
    if (!symbol) throw new Error('[FetcherHistoryRepository] empty symbol');
    const limit = options?.limit ?? 150;
    const sort = options?.asc ? 1 : -1;
    return getModelForClass(FetcherHistory).find({symbol}).sort({timestamp: sort}).limit(limit).exec();
  }

  async saveMany(data: FetcherHistoryInterface[]): Promise<void> {
    const expireAt = dayjs().add(this.settings.fetcherHistory.ttl, 'second').toDate();

    try {
      const done = await getModelForClass(FetcherHistory).bulkWrite(
        data.map(({fetcher, symbol, timestamp, value}) => {
          return {
            updateOne: {
              filter: {fetcher, symbol, timestamp},
              update: {fetcher, symbol, timestamp, value, expireAt},
              upsert: true,
              new: true,
            },
          };
        }),
        {ordered: false},
      );

      this.logger.info(
        `[FetcherHistoryRepository] new/updated ${done.insertedCount}/${done.modifiedCount}, total ${data.length}`,
      );
      this.logger.info(`[FetcherHistoryRepository] ${data.map((d) => `${d.fetcher}@${d.symbol}`).join(', ')}`);
    } catch (e: unknown) {
      this.logger.error(`[FetcherHistoryRepository] ${(e as Error).message}`);
    }
  }
}
