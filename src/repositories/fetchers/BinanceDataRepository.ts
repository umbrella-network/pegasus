import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {BinancePriceInputParams} from '../../services/fetchers/BinancePriceFetcher.js';
import {BinancePriceModel} from '../../models/fetchers/BinancePriceModel.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';

export type BinanceDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: BinancePriceInputParams;
};

@injectable()
export class BinanceDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(BinancePriceModel);
    this.logPrefix = '[BinanceDataRepository]';
  }

  async save(dataArr: BinanceDataRepositoryInput[]): Promise<void> {
    const payloads: BinancePriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.BinancePrice,
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

  async getPrices(params: BinancePriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const results = await this.model
      .find(
        {
          symbol: {$in: params.map((p) => p.symbol)},
          timestamp: this.getTimestampWindowFilter(timestamp),
        },
        {value: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(sortedResults: BinancePriceModel[], inputs: BinancePriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({symbol}) => map[symbol]);
  }
}
