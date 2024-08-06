import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, PriceValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {MetalPriceApiModel} from '../../models/fetchers/MetalPriceApiModel.js';
import {MetalPriceApiInputParams} from '../../services/fetchers/MetalPriceApiFetcher.js';

export type MetalPriceApiDataRepositoryInput = {
  params: MetalPriceApiInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class MetalPriceApiDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[GoldApiDataRepository]';

  async save(dataArr: MetalPriceApiDataRepositoryInput[]): Promise<void> {
    const payloads: MetalPriceApiModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.MetalPriceApi,
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

  private async savePrices(data: MetalPriceApiModel[]): Promise<void> {
    const model = getModelForClass(MetalPriceApiModel);

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

  async getPrices(params: MetalPriceApiInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({symbol, currency}) => {
      return {symbol, currency};
    });

    const results = await getModelForClass(MetalPriceApiModel)
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1, symbol: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: MetalPriceApiModel[],
    inputs: MetalPriceApiInputParams[],
  ): NumberOrUndefined[] {
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
