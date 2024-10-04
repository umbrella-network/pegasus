import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ReturnModelType} from '@typegoose/typegoose';
import {BulkWriteOpResultObject} from 'mongodb';
import {BeAnObject} from '@typegoose/typegoose/lib/types';

import Settings from '../../../types/Settings.js';
import {FetcherName} from '../../../types/fetchers.js';
import PriceSignerService from '../../../services/PriceSignerService.js';
import {IPurger} from '../../../types/IPurger.js';
import TimeService from '../../../services/TimeService.js';

// based on {BulkWriteError} from 'mongodb'
type BulkWriteError = {
  message: string;
  name?: string;
  writeErrors: [
    {
      code: number;
      index: number;
      errmsg: string;
    },
  ];
  result: {
    ok: number;
    nInserted: number;
  };
};

@injectable()
export abstract class CommonPriceDataRepository implements IPurger {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;

  // even with N minutes window, only newest price will be considered anyway
  // when we get old one again, it should not trigger any update
  // however for L2 data we need to check if we want this to be more fresh?
  private priceTimeWindowBefore = 2 * 60; // TODO time window, configurable?
  private priceTimeWindowAfter = 5; // TODO time window, configurable?
  protected hashVersion = 1;
  protected purgeLimit = 2000;

  // this is definition from @typegoose
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected model!: ReturnModelType<any, BeAnObject>;
  protected logPrefix = '';

  constructor() {
    this.logPrefix = '[CommonPriceDataRepository]';
  }

  async purge(): Promise<number> {
    try {
      const tStart = this.timeService.apply();

      const oneDay = 24 * 60 * 60;
      const daysAgo = this.timeService.apply(7 * oneDay);

      const results = await this.model
        .find({timestamp: {$lt: daysAgo}}, {id: true})
        .sort({timestamp: -1})
        .limit(this.purgeLimit);

      const ids = results.map((r: {_id: string}) => r._id);
      if (ids.length == 0) return 0;

      const del = await this.model.deleteMany({_id: {$in: ids}});
      const deleted = del.deletedCount ?? 0;

      if (deleted != 0) {
        const timeSpend = this.timeService.apply() - tStart;
        this.logger.debug(`${this.logPrefix} deleted ${deleted} records older than ${daysAgo} (${timeSpend}s)`);
      }

      return deleted;
    } catch (e) {
      this.logger.error(`${this.logPrefix} purge error: ${(e as Error).message}`);
    }

    return 0;
  }

  protected getTimestampWindowFilter(timestamp: number) {
    return {$gte: timestamp - this.priceTimeWindowBefore, $lte: timestamp + this.priceTimeWindowAfter};
  }

  protected createMessageToSign(
    value: number | bigint | string,
    timestamp: number,
    hashVersion: number,
    fetcherName: FetcherName,
    ...data: string[]
  ): string {
    const strValue = typeof value === 'string' ? value : value.toString(10);
    const dataToSign = [strValue, hashVersion.toString(), fetcherName, timestamp.toString(), ...data];
    return dataToSign.join(';');
  }

  // TODO when move to external DB, use timeseries
  protected async savePrices<T>(data: T[]): Promise<void> {
    try {
      this.logger.debug(`${this.logPrefix} ${data.length} data to save`);

      const result: BulkWriteOpResultObject = await this.model.bulkWrite(
        data.map((document) => {
          return {insertOne: {document}};
        }),
        {ordered: false},
      );

      if (data.length != result.insertedCount) {
        this.logger.warn(`${this.logPrefix} bulkWrite: got ${data.length} saved ${result.insertedCount}`);
      } else {
        this.logger.info(`${this.logPrefix} bulkWrite successful: ${result.insertedCount}`);
      }
    } catch (error) {
      const bulkError = error as BulkWriteError;

      if (bulkError.name == 'BulkWriteError') {
        const duplicates = bulkError.writeErrors.filter((e) => e.code == 11000).length;
        const errors = data.length - bulkError.result.nInserted;
        const saved = bulkError.result.nInserted;

        if (duplicates == errors) {
          this.logger.info(`${this.logPrefix} bulkWrite: got ${data.length}, saved ${saved}, duplicates ${duplicates}`);
        } else {
          this.logger.error(
            `${this.logPrefix} bulkWrite: got ${data.length}, duplicates ${duplicates}, errors ${errors}`,
          );

          const issues = bulkError.writeErrors.filter((e) => e.code != 11000);
          this.logger.debug(`${this.logPrefix} ${issues.map((i) => i.errmsg).join(', ')}`);
        }
      } else {
        this.logger.error(`${this.logPrefix} ${JSON.stringify(error)}`);
      }
    } finally {
      await this.purge();
    }
  }
}
