import {inject, injectable} from 'inversify';
import {Price} from '../models/Price';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';
import NodeCache from 'node-cache';
import {Pair} from '../types/Feed';
import Settings from '../types/Settings';

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
  cache: NodeCache;
  defaultPriceTTL: number;

  constructor(@inject('Settings') settings: Settings) {
    this.cache = new NodeCache({stdTTL: 60, checkperiod: 60});
    this.defaultPriceTTL = settings.mongodb.indexTTL.priceTTL;
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

  async getValueTimestamps(symbol: string, source: string): Promise<{value: number; timestamp: number}[]> {
    const prices = await getModelForClass(Price).find({source, symbol}).exec();
    return prices.map((price) => ({timestamp: Math.floor(price.timestamp.getTime() / 1000), value: price.value}));
  }

  async getLatestPrices(
    source: string,
    pairs: Pair[],
    maxTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return Promise.all(
      pairs.map(async ({fsym, tsym}) => {
        const valueTimestamp = await this.getValueAndTimestamp({
          symbol: `${fsym}-${tsym}`,
          source,
          timestamp: {from: new Date(maxTimestamp)},
        });

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};

        return {
          symbol: `${fsym}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }
}
