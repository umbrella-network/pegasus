import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FeedPrice, FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {MoCMeasurementPriceInputParams} from '../../services/fetchers/MoCMeasurementGetter.js';
import {PriceModel_MoCMeasurement} from '../../models/fetchers/PriceModel_MoCMeasurement.js';

export type MoCMeasurementDataRepositoryInput = {
  params: MoCMeasurementPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class MoCMeasurementDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_MoCMeasurement);
    this.logPrefix = '[MoCMeasurementDataRepository]';
  }

  async save(dataArr: MoCMeasurementDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_MoCMeasurement[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.MoCMeasurement,
          params.measurement_id,
          params.field,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        measurement_id: params.measurement_id,
        field: params.field,
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

  async getPrices(params: MoCMeasurementPriceInputParams[], timestamp: number): Promise<FeedPrice[]> {
    if (params.length === 0) {
      return [];
    }

    const or = params.map(({measurement_id, field}) => {
      return {measurement_id, field};
    });

    this.logger.debug(`${this.logPrefix} find: or: ${or.map((o) => JSON.stringify(o)).join(',')}`);
    this.logger.debug(`${this.logPrefix} find: timestamp: ${JSON.stringify(this.getTimestampWindowFilter(timestamp))}`);

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, field: 1, measurement_id: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PriceModel_MoCMeasurement[],
    inputs: MoCMeasurementPriceInputParams[],
  ): FeedPrice[] {
    const map: Record<string, number> = {};
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const getSymbol = (measurement_id: string, field: string) => `${measurement_id}-${field}`;

    sortedResults.forEach(({measurement_id, field, value}) => {
      const symbol = getSymbol(measurement_id, field);
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    const newest = inputs.map(({measurement_id, field}) => map[getSymbol(measurement_id, field)]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);

    return newest.map((price) => {
      return {value: price};
    });
  }
}
