import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_GoldApi} from '../../models/fetchers/PriceModel_GoldApi.js';
import {GoldApiPriceInputParams} from '../../services/fetchers/GoldApiPriceFetcher.js';

export type GoldApiDataRepositoryInput = {
  params: GoldApiPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class GoldApiDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_GoldApi);
    this.logPrefix = '[GoldApiDataRepository]';
  }

  async save(dataArr: GoldApiDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_GoldApi[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.GoldApiPrice,
          params.symbol,
          params.currency,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
        currency: params.currency,
        value: value.toString(),
        valueType: FetchedValueType.Price,
        timestamp,
        hashVersion,
        signature,
        priceHash: hash,
        signer: signerAddress,
      });
    });

    await this.savePrices(payloads);
  }

  async getPrices(params: GoldApiPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({symbol, currency}) => {
      return {symbol, currency};
    });

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, symbol: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(sortedResults: PriceModel_GoldApi[], inputs: GoldApiPriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};
    const getSymbol = (symbol: string, currency: string) => `${symbol}-${currency}`;

    sortedResults.forEach(({symbol, currency, value}) => {
      const key = getSymbol(symbol, currency);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(value);
    });

    return inputs.map(({symbol, currency}) => map[getSymbol(symbol, currency).toLowerCase()]);
  }
}
