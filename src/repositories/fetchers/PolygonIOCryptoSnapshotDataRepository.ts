import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_PolygonIOCryptoSnapshot} from '../../models/fetchers/PriceModel_PolygonIOCryptoSnapshot.js';
import {PolygonIOCryptoSnapshotInputParams} from '../../services/fetchers/PolygonIOCryptoSnapshotPriceFetcher.js';

export type PolygonIOCryptoSnapshotDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: PolygonIOCryptoSnapshotInputParams;
};

@injectable()
export class PolygonIOCryptoSnapshotDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_PolygonIOCryptoSnapshot);
    this.logPrefix = '[PolygonIOCryptoSnapshotDataRepository]';
  }

  async save(dataArr: PolygonIOCryptoSnapshotDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_PolygonIOCryptoSnapshot[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOCryptoSnapshotPrice,
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

  async getPrices(params: PolygonIOCryptoSnapshotInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const $in = params.map((p) => p.symbol.toLowerCase());

    const results = await this.model
      .find({symbol: {$in}, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, symbol: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PriceModel_PolygonIOCryptoSnapshot[],
    inputs: PolygonIOCryptoSnapshotInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({symbol}) => map[symbol.toLowerCase()]);
  }
}
