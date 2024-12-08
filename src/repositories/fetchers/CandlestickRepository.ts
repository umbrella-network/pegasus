import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {BinancePriceInputParams} from '../../services/fetchers/BinancePriceGetter.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {CandlestickModel} from '../../models/fetchers/CandlestickModel.js';
import {BinanceCandlestickInterval} from '../../workers/fetchers/BinanceCandlestickFetcher.js';

export type Candle = {
  symbol: string;
  interval: number;
};

export type CandlestickRepositoryInput = {
  fetcher: FetcherName;
  value: number;
  timestamp: number; // start time
  params: Candle;
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
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.BinanceCandlestick,
          params.symbol,
          params.interval.toString(),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp, fetcher}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        fetcher,
        symbol: params.symbol,
        value: value.toString(),
        interval: params.interval,
        valueType: FetchedValueType.Number,
        timestamp,
        hashVersion,
        signature,
        priceHash: hash,
        signer: signerAddress,
        expireAt: this.expireAtDate(),
      });
    });

    await this.savePrices(payloads);
  }

  async getMany(
    timestamp: number,
    params: BinancePriceInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    const vwapParams = params.filter((p) => !!p.vwapInterval);
    if (vwapParams.length == 0) return params.map(() => undefined);

    const $or = vwapParams.map((p) => {
      if (!p.vwapInterval) throw new Error('vwapInterval filtering not working');

      return {
        symbol: p.symbol.toLowerCase(),
        interval: this.intervalToSeconds(p.vwapInterval),
        timestamp: Math.trunc(this.beginOfIntervalMs(p.vwapInterval, timestamp) / 1000),
      };
    });

    this.logger.debug(`${this.logPrefix} or: ${JSON.stringify($or)}`);

    const results: CandlestickModel[] = await this.model
      .find({$or}, {value: 1, symbol: 1, interval: 1, timestamp: 1})
      .exec();

    const map: Record<string, CandlestickModel> = {};

    results.forEach((r) => {
      map[r.symbol] = r;
    });

    return params.map((p) => map[p.symbol.toLowerCase()]);
  }

  public beginOfIntervalMs(interval: BinanceCandlestickInterval, now?: number): number {
    const intervalSec = this.intervalToSeconds(interval);
    const timestamp = Math.trunc(now ? now : Date.now() / 1000);
    return (timestamp - (timestamp % intervalSec)) * 1000;
  }
}
