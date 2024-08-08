import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {MetalsDevApiModel} from '../../models/fetchers/MetalsDevApiModel.js';
import {MetalsDevApiPriceInputParams} from '../../services/fetchers/MetalsDevApiFetcher.js';

export type MetalsDevApiDataRepositoryInput = {
  params: MetalsDevApiPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class MetalsDevApiDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[MetalsDevApiDataRepository]';

  constructor() {
    super();
    this.model = getModelForClass(MetalsDevApiModel);
  }

  async save(dataArr: MetalsDevApiDataRepositoryInput[]): Promise<void> {
    const payloads: MetalsDevApiModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.MetalsDevApi,
          params.metal,
          params.currency,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        metal: params.metal,
        currency: params.currency,
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

  private async savePrices(data: MetalsDevApiModel[]): Promise<void> {
    try {
      await this.model.bulkWrite(
        data.map((doc) => {
          return {insertOne: {document: doc}};
        }),
      );
    } catch (error) {
      this.logger.error(`${this.logPrefix} couldn't perform bulkWrite: ${error}`);
    }
  }

  async getPrices(params: MetalsDevApiPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({metal, currency}) => {
      return {metal, currency};
    });

    const results = await this.model
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1, metal: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: MetalsDevApiModel[],
    inputs: MetalsDevApiPriceInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};
    const getSymbol = (metal: string, currency: string) => `${metal}-${currency}`;

    sortedResults.forEach(({metal, currency, value}) => {
      const key = getSymbol(metal, currency);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(value);
    });

    return inputs.map(({metal, currency}) => map[getSymbol(metal, currency).toLowerCase()]);
  }
}
