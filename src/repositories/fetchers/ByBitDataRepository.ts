import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
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
  constructor() {
    super();
    this.model = getModelForClass(ByBitPriceModel);
    this.logPrefix = '[ByBitDataRepository]';
  }

  async save(dataArr: ByBitDataRepositoryInput[]): Promise<void> {
    const payloads: ByBitPriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, usdIndexPrice, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.ByBitPrice,
          params.symbol,
          usdIndexPrice === undefined ? '' : usdIndexPrice.toString(10),
        );
        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, usdIndexPrice, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
        value: value.toString(),
        usdIndexPrice: usdIndexPrice ?? null,
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

  async getPrices(params: ByBitPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const results = await this.model
      .find(
        {
          symbol: {$in: params.map((p) => p.symbol)},
          timestamp: {$gte: timestamp - this.priceTimeWindow},
          usdIndexPrice: {$ne: null},
        },
        {value: 1, usdIndexPrice: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(sortedResults: ByBitPriceModel[], inputs: ByBitPriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, usdIndexPrice}) => {
      if (map[symbol] || !usdIndexPrice) return; // already set newest price

      map[symbol] = usdIndexPrice;
    });

    return inputs.map(({symbol}) => map[symbol]);
  }
}
