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
}
