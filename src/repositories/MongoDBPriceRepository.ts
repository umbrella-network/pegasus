import {injectable} from 'inversify';
import {Price} from '../models/Price';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';
import NodeCache from 'node-cache';

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

// TODO: This should replace and deprecate the current PriceRepository
@injectable()
export class MongoDBPriceRepository {
  defaultPriceTTL = 60 * 60; // TODO: this could be configurable
  cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({stdTTL: 60, checkperiod: 60});
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

  async save(props: SavePriceProps): Promise<Price> {
    const {source, symbol, value, timestamp} = props;
    const expireAt = props.expireAt || dayjs().add(this.defaultPriceTTL, 'second').toDate();

    return getModelForClass(Price)
      .findOneAndUpdate(
        {source, symbol, timestamp},
        {source, symbol, timestamp, value, expireAt},
        {upsert: true, new: true},
      )
      .exec();
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
}
