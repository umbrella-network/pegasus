import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PolygonIOCryptoPriceWSInputParams} from "../../services/fetchers/PolygonIOCryptoPriceWSFetcher.js";
import {PolygonIOCryptoPriceWSModel} from "../../models/fetchers/PolygonIOCryptoPriceWSModel";

export type PolygonIOCryptoWSDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: PolygonIOCryptoPriceWSInputParams;
};

@injectable()
export class PolygonIOCryptoPriceWSDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[PolygonIOCryptoPriceWSDataRepository]';

  async save(dataArr: PolygonIOCryptoWSDataRepositoryInput[]): Promise<void> {
    const payloads: PolygonIOCryptoPriceWSModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOCryptoPriceWS,
          params.symbol,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
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

  private async savePrices(data: PolygonIOCryptoPriceWSModel[]): Promise<void> {
    const model = getModelForClass(PolygonIOCryptoPriceWSModel);

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

  async getPrices(params: PolygonIOCryptoPriceWSInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const results = await getModelForClass(PolygonIOCryptoPriceWSModel)
      .find(
        {
          symbol: {$in: params.map((p) => p.symbol)},
          timestamp: {$gte: timestamp - this.priceTimeWindow},
        },
        {value: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PolygonIOCryptoPriceWSModel[],
    inputs: PolygonIOCryptoPriceWSInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({symbol}) => map[symbol]);
  }
}
