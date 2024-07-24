import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';

import PriceSignerService from '../services/PriceSignerService.js';
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
  quoteLiquidity?: string;
};

@injectable()
export class PriceDataRepository {
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;

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

    const bulkOps = await Promise.all(
      data.map(async (doc) => {
        const hashVersion = 1;
        const messageToSign = this.createMessageToSign(doc, hashVersion);
        const {signerAddress, signature, hash} = await this.priceSignerService.sign(messageToSign);
        return {
          updateOne: {
            filter: {...doc},
            update: {...doc, signer: signerAddress, priceHash: hash, signature, hashVersion},
            upsert: true,
          },
        };
      }),
    );

    try {
      await model.bulkWrite(bulkOps);
    } catch (error) {
      this.logger.error(`[PriceDataRepository] couldn't perform bulkWrite for PriceData: ${error}`);
    }
  }

  createMessageToSign(data: PriceDataPayload, hashVersion: number): string {
    const {fetcher, value, valueType, timestamp, feedBase, feedQuote, fetcherSource, quoteLiquidity} = data;
    return (
      `${hashVersion};${fetcher};${value};${valueType};${timestamp};${feedBase};${feedQuote};` +
      `${fetcherSource};${quoteLiquidity}`
    );
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
