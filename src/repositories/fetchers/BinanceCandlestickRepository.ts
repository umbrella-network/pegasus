import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {BinancePriceInputParams} from '../../services/fetchers/BinancePriceGetter.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {CandlestickModel_Binance} from '../../models/fetchers/CandlestickModel_Binance.js';
import {BinanceCandlestickInterval} from '../../workers/fetchers/BinanceCandlestickFetcher';

export type BinanceCandle = {
  symbol: string;
  interval: BinanceCandlestickInterval;
};

export type BinanceCandlestickRepositoryInput = {
  value: number;
  timestamp: number; // start time
  params: BinanceCandle;
};

@injectable()
export class BinanceCandlestickRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(CandlestickModel_Binance);
    this.logPrefix = '[BinanceCandlestickRepository]';
  }

  public intervalToSeconds(i: BinanceCandlestickInterval): number {
    switch (i) {
      case '1s':
        return 1;
      case '1m':
        return 60;
      case '3m':
        return 3 * 60;
      case '5m':
        return 5 * 60;
      case '15m':
        return 15 * 60;
      case '30m':
        return 30 * 60;
      case '1h':
        return 60 * 60;
      case '2h':
        return 60 * 60 * 2;
      case '4h':
        return 60 * 60 * 4;
      case '6h':
        return 60 * 60 * 6;
      case '8h':
        return 60 * 60 * 8;
      case '12h':
        return 60 * 60 * 12;
      case '1d':
        return 60 * 60 * 24;
      case '3d':
        return 60 * 60 * 24 * 3;
      case '1w':
        return 60 * 60 * 24 * 7;
      case '1M':
        return 60 * 60 * 24 * 30;
    }

    throw new Error(`unknown BinanceCandlestickInterval: ${i}`);
  }

  async save(dataArr: BinanceCandlestickRepositoryInput[]): Promise<void> {
    const payloads: CandlestickModel_Binance[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.BinanceCandlestick,
          params.symbol,
          this.intervalToSeconds(params.interval).toString(),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
        value: value.toString(),
        interval: this.intervalToSeconds(params.interval),
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

  // async getOne(
  //   timestamp: number,
  //   symbol: string,
  //   interval: BinanceCandlestickInterval,
  // ): Promise<CandlestickModel_Binance | undefined> {
  //   const results = await this.model
  //     .find(
  //       {
  //         symbol: symbol.toLowerCase(),
  //         interval: this.intervalToSeconds(interval),
  //         timestamp: {$ge: timestamp, $lt: timestamp + interval},
  //       },
  //       {value: 1, symbol: 1},
  //     )
  //     .exec();
  //
  //   return results[0];
  // }

  async getMany(
    timestamp: number,
    params: BinancePriceInputParams[],
  ): Promise<(CandlestickModel_Binance | undefined)[]> {
    const filteredParams = params.filter((p) => !!p.vwapInterval);
    if (filteredParams.length == 0) return params.map(() => undefined);

    const $or = filteredParams.map((p) => {
      if (!p.vwapInterval) throw new Error('vwapInterval filtering not working');

      return {
        symbol: p.symbol.toLowerCase(),
        interval: this.intervalToSeconds(p.vwapInterval),
        timestamp: Math.trunc(this.beginOfIntervalMs(p.vwapInterval, timestamp) / 1000),
      };
    });

    this.logger.debug(`${this.logPrefix} or: ${JSON.stringify($or)}`);

    const results: CandlestickModel_Binance[] = await this.model
      .find({$or}, {value: 1, symbol: 1, interval: 1, timestamp: 1})
      .exec();

    const map: Record<string, CandlestickModel_Binance> = {};

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
