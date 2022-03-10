import {injectable} from 'inversify';
import {Price} from '../models/Price';
import {getModelForClass} from '@typegoose/typegoose';
import dayjs from 'dayjs';

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
    from: Date;
    to: Date;
  };
};

// TODO: This should replace and deprecate the current PriceRepository
@injectable()
export class MongoDBPriceRepository {
  defaultPriceTTL = 60 * 60; // TODO: this could be configurable

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
    const {
      source,
      symbol,
      timestamp: {from, to},
    } = props;

    const price = await getModelForClass(Price)
      .findOne(
        {
          source,
          symbol,
          timestamp: {
            $gte: from,
            $lt: to,
          },
        },
        {value: 1},
        {sort: {timestamp: -1}},
      )
      .exec();

    return price?.value;
  }
}
