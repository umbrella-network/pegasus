import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PolygonIOStockSnapshotPriceModel} from '../../models/fetchers/PolygonIOStockSnapshotPriceModel.js';
import {PolygonIOStockSnapshotPriceInputParams} from '../../services/fetchers/PolygonIOStockSnapshotPriceFetcher.js';

export type PolygonIOStockSnapshotDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: PolygonIOStockSnapshotInputParams;
};

@injectable()
export class PolygonIOStockSnapshotDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[PolygonIOStockSnapshotDataRepository]';

  async save(dataArr: PolygonIOStockSnapshotDataRepositoryInput[]): Promise<void> {
    const payloads: PolygonIOStockSnapshotPriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOStockSnapshotPrice,
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

  private async savePrices(data: PolygonIOStockSnapshotPriceModel[]): Promise<void> {
    const model = getModelForClass(PolygonIOStockSnapshotPriceModel);

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

  async getPrices(params: PolygonIOStockSnapshotInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const results = await getModelForClass(PolygonIOStockSnapshotPriceModel)
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
    sortedResults: PolygonIOStockSnapshotPriceModel[],
    inputs: PolygonIOStockSnapshotInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({symbol}) => map[symbol]);
  }
}
