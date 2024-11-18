import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, FetchedValueType, FeedPrice} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_MetalsDevApi} from '../../models/fetchers/PriceModel_MetalsDevApi.js';
import {MetalsDevApiPriceInputParams} from '../../services/fetchers/MetalsDevApiGetter.js';

export type MetalsDevApiDataRepositoryInput = {
  params: MetalsDevApiPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class MetalsDevApiDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_MetalsDevApi);
    this.logPrefix = '[MetalsDevApiDataRepository]';
  }

  async save(dataArr: MetalsDevApiDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_MetalsDevApi[] = [];

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
        expireAt: this.expireAtDate(),
      });
    });

    await this.savePrices(payloads);
  }

  async getPrices(params: MetalsDevApiPriceInputParams[], timestamp: number): Promise<FeedPrice[]> {
    const or = params.map(({metal, currency}) => {
      return {metal: metal.toLowerCase(), currency: currency.toLowerCase()};
    });

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, metal: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PriceModel_MetalsDevApi[],
    inputs: MetalsDevApiPriceInputParams[],
  ): FeedPrice[] {
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const map: Record<string, number> = {};
    const getSymbol = (metal: string, currency: string) => `${metal}-${currency}`;

    sortedResults.forEach(({metal, currency, value}) => {
      const key = getSymbol(metal, currency);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(value);
    });

    const newest = inputs.map(({metal, currency}) => map[getSymbol(metal, currency).toLowerCase()]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);

    return newest.map((price) => {
      return {value: price};
    });
  }
}
