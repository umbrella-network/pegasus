import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_PolygonIOStockSnapshot} from '../../models/fetchers/PriceModel_PolygonIOStockSnapshot.js';
import {PolygonIOStockSnapshotFetcherInputParams} from '../../services/fetchers/PolygonIOStockSnapshotPriceGetter.js';

export type PolygonIOStockSnapshotDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: PolygonIOStockSnapshotFetcherInputParams;
};

@injectable()
export class PolygonIOStockSnapshotDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_PolygonIOStockSnapshot);
    this.logPrefix = '[PolygonIOStockSnapshotDataRepository]';
  }

  async save(dataArr: PolygonIOStockSnapshotDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_PolygonIOStockSnapshot[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOStockSnapshotPrice,
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
        expireAt: this.expireAtDate(),
      });
    });

    await this.savePrices(payloads);
  }

  async getPrices(params: PolygonIOStockSnapshotFetcherInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    if (params.length === 0) {
      return [];
    }

    const $in = params.map((p) => p.ticker.toLowerCase());

    this.logger.debug(
      `${this.logPrefix} find: ${$in.join(',')}, ${JSON.stringify(this.getTimestampWindowFilter(timestamp))}`,
    );

    const results = await this.model
      .find({symbol: {$in}, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, symbol: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PriceModel_PolygonIOStockSnapshot[],
    inputs: PolygonIOStockSnapshotFetcherInputParams[],
  ): NumberOrUndefined[] {
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const map: Record<string, number> = {};

    sortedResults.forEach(({ticker, value}) => {
      if (map[ticker]) return; // already set newest price

      map[ticker] = parseFloat(value);
    });

    const newest = inputs.map(({ticker}) => map[ticker.toLowerCase()]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);
    return newest;
  }
}
