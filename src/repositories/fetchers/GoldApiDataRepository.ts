import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, PriceValueType} from '../../types/fetchers.js';
import {ByBitPriceModel} from '../../models/fetchers/ByBitPriceModel.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {GoldApiPriceModel} from '../../models/fetchers/GoldApiPriceModel.js';
import {GoldApiPriceInputParams} from '../../services/fetchers/GoldApiPriceFetcher.js';

export type GoldApiDataRepositoryInput = {
  params: GoldApiPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class GoldApiDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[GoldApiDataRepository]';

  async save(dataArr: GoldApiDataRepositoryInput[]): Promise<void> {
    const payloads: GoldApiPriceModel[] = [];
    const hashVersion = 1;

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          hashVersion,
          FetcherName.GoldApiPrice,
          params.symbol,
          params.currency,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
        currency: params.currency,
        value: value.toString(),
        valueType: PriceValueType.Price,
        timestamp,
        hashVersion,
        signature,
        priceHash: hash,
        signer: signerAddress,
      });
    });

    await this.savePrices(payloads);
  }

  private async savePrices(data: GoldApiPriceModel[]): Promise<void> {
    const model = getModelForClass(ByBitPriceModel);

    try {
      await model.bulkWrite(
        data.map((doc) => {
          return {insertOne: {document: doc}};
        }),
      );
    } catch (error) {
      this.logger.error(`${this.logPrefix} couldn't perform bulkWrite: ${error}`);
    }
  }

  async getPrices(params: GoldApiPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({symbol, currency}) => {
      return {symbol, currency};
    });

    const results = await getModelForClass(GoldApiPriceModel)
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1, symbol: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(sortedResults: GoldApiPriceModel[], inputs: GoldApiPriceInputParams[]): NumberOrUndefined[] {
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
