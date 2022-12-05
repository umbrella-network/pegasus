import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';

import {Price} from '../models/Price';
import Settings from '../types/Settings';
import {FeedPrice} from 'src/types/Feed';
import {chunk} from 'lodash';
import {Logger} from 'winston';

export type SavePriceProps = {
  source: string;
  symbol: string;
  value: number;
  timestamp: Date;
  expireAt?: Date;
};

export type LatestPriceProps = {
  source: string;
  symbol: string;
  timestamp: {
    from?: Date;
    to?: Date;
  };
};

@injectable()
export class PriceRepository {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  defaultPriceTTL: number;

  constructor(@inject('Settings') settings: Settings) {
    this.defaultPriceTTL = settings.mongodb.indexTTL.priceTTL;
  }

  async savePrices(price: FeedPrice[]): Promise<void> {
    try {
      for (const batch of chunk(price, this.settings.mongodb.priceBatchSize)) {
        await this.saveBatch(batch);
      }
      this.logger.info('[PriceService] Prices saved');
    } catch (e) {
      this.logger.error(`[PriceService] Error saving prices, skipping...`);
      this.logger.error('[PriceService]', e);
    }
  }

  async saveBatch(props: SavePriceProps[]): Promise<void> {
    const operations = [];

    for (const priceProp of props) {
      const {source, symbol, value, timestamp} = priceProp;
      const expireAt = priceProp.expireAt || dayjs().add(this.defaultPriceTTL, 'second').toDate();

      operations.push({
        updateOne: {
          filter: {source, symbol, timestamp},
          update: {source, symbol, timestamp, value, expireAt},
          upsert: true,
          new: true,
        },
      });
    }

    await getModelForClass(Price).bulkWrite(operations);
  }

  async getLatestPrice(props: LatestPriceProps): Promise<number | undefined> {
    return (await this.getLatestPriceRecord(props))?.value;
  }

  async getLatestPriceRecord(props: LatestPriceProps): Promise<Price | undefined> {
    const {
      source,
      symbol,
      timestamp: {from, to},
    } = props;

    const timestampFilter: {[key: string]: Date} = {};
    if (from) timestampFilter['$gte'] = from;
    if (to) timestampFilter['$lt'] = to;

    const price = await getModelForClass(Price)
      .findOne(
        {
          source,
          symbol,
          timestamp: timestampFilter,
        },
        {},
        {sort: {timestamp: -1}},
      )
      .exec();

    return price || undefined;
  }

  async getValueAndTimestamp(props: LatestPriceProps): Promise<{value: number; timestamp: number} | null> {
    const {source, symbol, timestamp} = props;
    const price = await this.getLatestPriceRecord({
      source,
      symbol,
      timestamp,
    });

    return price ? {timestamp: Math.floor(price.timestamp.getTime() / 1000), value: price.value} : null;
  }

  async getSourcePrices(symbol: string, source: string): Promise<{value: number; timestamp: number}[]> {
    const prices = await getModelForClass(Price).find({source, symbol}).exec();
    return prices.map((price) => ({timestamp: Math.floor(price.timestamp.getTime() / 1000), value: price.value}));
  }
}
