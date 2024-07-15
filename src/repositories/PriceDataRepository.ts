import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';
import {ethers} from 'ethers';

import {PriceDataModel} from '../models/PriceDataModel.js';
import {FetcherResult, StringOrUndefined} from '../types/fetchers.js';
import FeedSymbolChecker from '../services/FeedSymbolChecker.js';
import TimeService from '../services/TimeService.js';
import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DeviationSignerRepository} from './DeviationSignerRepository.js';

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
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Settings') settings!: Settings;
  @inject('Logger') private logger!: Logger;
  @inject(DeviationSignerRepository) protected deviationSignerRepository!: DeviationSignerRepository;

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

    const deviationSigner = this.deviationSignerRepository.get(ChainsIds.ROOTSTOCK);
    const signer = await deviationSigner.address();
    const hashVersion = 1;

    const bulkOps = await Promise.all(
      data.map(async (doc) => {
        const newDoc = {...doc, hashVersion};
        const priceHash = ethers.utils.id(String(newDoc));
        const signature = await deviationSigner.apply(priceHash);
        return {
          updateOne: {
            filter: {...doc},
            update: {...newDoc, signer, priceHash, signature},
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

  async saveFetcherResults(
    fetcherResult: FetcherResult,
    symbols: StringOrUndefined[],
    fetcherName: string,
    valueType: PriceValueType,
    fetcherSource: string,
  ): Promise<void> {
    const timestamp = fetcherResult.timestamp || this.timeService.apply();
    const payloads: PriceDataPayload[] = [];

    for (const [ix, price] of fetcherResult.prices.entries()) {
      if (!price) continue;

      const baseQuote = this.feedSymbolChecker.apply(symbols[ix]);
      if (!baseQuote) continue;

      const [feedBase, feedQuote] = baseQuote;

      payloads.push({
        fetcher: fetcherName,
        value: price.toString(),
        valueType,
        timestamp,
        feedBase,
        feedQuote,
        fetcherSource,
      });
    }

    await this.savePrices(payloads);
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
