import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {MoCMeasurementPriceInputParams} from "../../services/fetchers/MoCMeasurementGetter.js";
import {PriceModel_MoCMeasurement} from "../../models/fetchers/PriceModel_MoCMeasurement";

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
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        measurement_id: params.measurement_id,
        block_number: params.,
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

  async getPrices(params: MoCMeasurementPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    if (params.length === 0) {
      return [];
    }

    const or = params.map(({id, currency}) => {
      return {id: id.toLowerCase(), currency: currency.toLowerCase()};
    });

    this.logger.debug(`${this.logPrefix} find: or: ${or.map((o) => JSON.stringify(o)).join(',')}`);
    this.logger.debug(`${this.logPrefix} find: timestamp: ${JSON.stringify(this.getTimestampWindowFilter(timestamp))}`);

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, id: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PriceModel_MoCMeasurement[],
    inputs: MoCMeasurementPriceInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const getSymbol = (id: string, currency: string) => `${id}-${currency}`;

    sortedResults.forEach(({id, currency, value}) => {
      const symbol = getSymbol(id, currency);
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    const newest = inputs.map(({id, currency}) => map[getSymbol(id, currency).toLowerCase()]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);
    return newest;
  }
}
