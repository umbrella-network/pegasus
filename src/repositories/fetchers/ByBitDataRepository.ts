import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, PriceValueType} from '../../types/fetchers.js';
import {ByBitPriceInputParams} from '../../services/fetchers/ByBitPriceFetcher.js';
import {ByBitPriceModel} from '../../models/fetchers/ByBitPriceModel.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';

export type ByBitDataRepositoryInput = {
  params: ByBitPriceInputParams;
  value: number;
  usdIndexPrice?: number;
  timestamp: number;
};

@injectable()
export class ByBitDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[ByBitDataRepository]';

  async save(dataArr: ByBitDataRepositoryInput[]): Promise<void> {
    const payloads: ByBitPriceModel[] = [];
    const hashVersion = 1;

    const signatures = await Promise.all(
      dataArr.map(({value, usdIndexPrice, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          hashVersion,
          FetcherName.ByBitPrice,
          params.symbol,
          usdIndexPrice === undefined ? '' : usdIndexPrice.toString(10),
        );
        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, usdIndexPrice, params, timestamp}, ix) => {
      const {signerAddress, signature, hash} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
        value: value.toString(),
        usdIndexPrice,
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

  private async savePrices(data: ByBitPriceModel[]): Promise<void> {
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

  async getPrices(params: ByBitPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({symbol}) => {
      return {symbol};
    });

    const results = await getModelForClass(ByBitPriceModel)
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1, symbol: 1})
      .sort({timestamp: -1})
      .exec();

    return this.generateResults(results, params);
  }

  private generateResults(results: ByBitPriceModel[], inputs: ByBitPriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    results.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({symbol}) => map[symbol]);
  }
}
