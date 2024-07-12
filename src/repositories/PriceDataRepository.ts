import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';

import {PriceDataModel} from '../models/PriceDataModel.js';
import Settings from '../types/Settings.js';

export enum PriceValueType {
  Price = 'Price',
}

export type PriceDataPayload = {
  fetcher: string;
  value: string;
  valueType: PriceValueType;
  timestamp: number; // timestamp stamp associated with the value (not the timestamp to when it is stored)
  feedBase: string; // base configurable on feeds.yaml e.g. WBTC-USDC -> base is WBTC
  feedQuote: string; // quote configurable on feeds.yaml e.g. WBTC-USDC -> quote is USDC
  fetcherSource: string;
};

@injectable()
export class PriceDataRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') private logger!: Logger;

  async savePrice(data: PriceDataPayload): Promise<void> {
    try {
      const doc = await getModelForClass(PriceDataModel).create({...data});
      await doc.save();
    } catch (error) {
      this.logger.error(`[PriceDataRepository] couldn't create document for PriceData: ${error}`);
    }
  }

  async savePrices(data: PriceDataPayload[]): Promise<void> {
    const model = await getModelForClass(PriceDataModel);

    const bulkOps = data.map((doc) => ({
      updateOne: {
        filter: {...doc},
        update: doc,
        upsert: true,
      },
    }));

    try {
      await model.bulkWrite(bulkOps);
    } catch (error) {
      this.logger.error(`[PriceDataRepository] couldn't perform bulkWrite for PriceData: ${error}`);
    }
  }

  async latest(limit = 150): Promise<PriceDataModel[]> {
    return getModelForClass(PriceDataModel).find().sort({timestamp: -1}).limit(limit).exec();
  }

  async latestSymbols(): Promise<string[]> {
    const documents = await getModelForClass(PriceDataModel)
      .aggregate([
        {$sort: {timestamp: -1}},
        {
          $group: {
            _id: {feedQuote: '$feedQuote', feedBase: '$feedBase'},
            latestDocument: {$first: '$$ROOT'},
          },
        },
        {
          $project: {
            _id: 0,
            symbol: {$concat: ['$latestDocument.feedBase', '-', '$latestDocument.feedQuote']},
          },
        },
        {
          // deterministic ordering
          $sort: {symbol: 1},
        },
      ])
      .exec();

    return documents.map((item: {symbol: string}) => item.symbol);
  }

  async latestPrice(feedBase: string, feedQuote: string, limit = 150): Promise<PriceDataModel[]> {
    if (!feedBase || !feedQuote) throw new Error('[PriceDataRepository] empty symbol');
    return getModelForClass(PriceDataModel).find({feedBase, feedQuote}).sort({timestamp: -1}).limit(limit).exec();
  }
}
