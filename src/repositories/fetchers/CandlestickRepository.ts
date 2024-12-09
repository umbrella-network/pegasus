import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {CandlestickModel} from '../../models/fetchers/CandlestickModel.js';

export type Candlestick = {
  symbol: string;
  interval: number;
  value: number;
  timestamp: number; // start time
};

export type CandlestickRepositoryInput = {
  fetcher: FetcherName;
  params: Candlestick;
};

export type CandlestickSearchInput = {
  fetcher: FetcherName;
  params: {
    symbol: string;
    interval: number;
    timestamp: number;
  };
};

@injectable()
export class CandlestickRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(CandlestickModel);
    this.logPrefix = '[CandlestickRepository]';
  }

  async save(dataArr: CandlestickRepositoryInput[]): Promise<void> {
    const payloads: CandlestickModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({fetcher, params}) => {
        const messageToSign = this.createMessageToSign(
          params.value,
          params.timestamp,
          this.hashVersion,
          fetcher,
          params.symbol,
          params.interval.toString(),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({params, fetcher}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        fetcher,
        symbol: params.symbol,
        value: params.value.toString(),
        interval: params.interval,
        valueType: FetchedValueType.Number,
        timestamp: params.timestamp,
        hashVersion,
        signature,
        priceHash: hash,
        signer: signerAddress,
        expireAt: this.expireAtDate(),
      });
    });

    await this.savePrices(payloads);
  }

  async getMany(timestamp: number, params: CandlestickSearchInput[]): Promise<(CandlestickModel | undefined)[]> {
    const vwapParams = params.filter((p) => p.params.interval != 0);
    if (vwapParams.length == 0) return params.map(() => undefined);

    const $or = vwapParams.map(({fetcher, params}) => {
      return {
        fetcher,
        symbol: params.symbol.toLowerCase(),
        interval: params.interval,
        timestamp: this.beginOfIntervalSec(params.interval, timestamp),
      };
    });

    this.logger.debug(`${this.logPrefix} or: ${JSON.stringify($or)}`);

    const results: CandlestickModel[] = await this.model
      .find({$or}, {value: 1, symbol: 1, interval: 1, timestamp: 1, fetcher: 1})
      .exec();

    const map: Record<string, CandlestickModel> = {};

    results.forEach((r) => {
      map[r.symbol] = r;
    });

    return params.map(({params}) => map[params.symbol.toLowerCase()]);
  }

  public beginOfIntervalSec(intervalSec: number, now?: number): number {
    const timestamp = Math.trunc(now ? now : Date.now() / 1000);
    return timestamp - (timestamp % intervalSec);
  }
}
