import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PolygonIOCurrencySnapshotGramsPriceModel} from '../../models/fetchers/PolygonIOCurrencySnapshotGramsPriceModel.js';
import {PolygonIOCurrencySnapshotGramsInputParams} from '../../services/fetchers/PolygonIOCurrencySnapshotGramsFetcher.js';

export type PolygonIOCurrencySnapshotGramsDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: PolygonIOCurrencySnapshotGramsInputParams;
};

@injectable()
export class PolygonIOCurrencySnapshotGramsDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PolygonIOCurrencySnapshotGramsPriceModel);
    this.logPrefix = '[PolygonIOCurrencySnapshotGramsDataRepository]';
  }

  async save(dataArr: PolygonIOCurrencySnapshotGramsDataRepositoryInput[]): Promise<void> {
    const payloads: PolygonIOCurrencySnapshotGramsPriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOCryptoSnapshotPrice,
          params.ticker,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        ticker: params.ticker,
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

  async getPrices(
    params: PolygonIOCurrencySnapshotGramsInputParams[],
    timestamp: number,
  ): Promise<NumberOrUndefined[]> {
    const results = await this.model
      .find(
        {
          ticker: {$in: params.map((p) => p.ticker)},
          timestamp: this.getTimestampWindowFilter(timestamp),
        },
        {value: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PolygonIOCurrencySnapshotGramsPriceModel[],
    inputs: PolygonIOCurrencySnapshotGramsInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({ticker, value}) => {
      if (map[ticker]) return; // already set newest price

      map[ticker] = parseFloat(value);
    });

    return inputs.map(({ticker}) => map[ticker.toLowerCase()]);
  }
}
