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
//export type FetcherHistoryInterface = {
//  fetcher: string;
//  symbol: string;
//  timestamp: number;
//  value: string;
//};

@injectable()
export class PriceDataRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') private logger!: Logger;

  async savePrice(data: PriceDataPayload): Promise<void> {
    try {
      const doc = await getModelForClass(PriceDataModel).create({...data});
      await doc.save();
    } catch (error) {
      this.logger.error(`couldn't create document for PriceData: ${error}`);
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
      this.logger.error(`couldn't perform bulkWrite for PriceData: ${error}`);
    }
  }

  async latest(limit = 150): Promise<PriceDataModel[]> {
    return getModelForClass(PriceDataModel).find().sort({timestamp: -1}).limit(limit).exec();
  }

  async latestSymbols(): Promise<string[]> {
    const symbols = await getModelForClass(PriceDataModel).find({}, {feedBase: 1, feedQuote: 1}).limit(1000).exec();
    const unique: Record<string, number> = {};

    // TODO: this logic is for me a bit complicated to understand
    // maybe a function can help to do thar more clear
    //
    // I can just understand that in case there are these feeds:
    // SYMBOL1
    // SYMBOL2
    // SYMBOL1
    // it orders them like SYMBOL1, SYMBOL2 because SYMBOL1 appears more often than SYMBOL2
    symbols.forEach((s) => {
      const symbol = s.feedBase + '-' + s.feedQuote;
      unique[symbol] = unique[symbol] ? unique[symbol] + 1 : 1;
    });

    return Object.keys(unique).sort((a, b) => {
      return unique[a] == unique[b] ? (a < b ? -1 : 1) : unique[b] - unique[a];
    });
  }

  async latestPrice(feedBase: string, feedQuote: string, limit = 150): Promise<PriceDataModel[]> {
    if (!feedBase || !feedQuote) throw new Error('[FetcherHistoryRepository] empty symbol');
    return getModelForClass(PriceDataModel).find({feedBase, feedQuote}).sort({timestamp: -1}).limit(limit).exec();
  }
}
