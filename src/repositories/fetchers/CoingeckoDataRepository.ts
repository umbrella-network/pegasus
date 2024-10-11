import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CoingeckoPriceInputParams} from '../../services/fetchers/CoingeckoPriceGetter.js';
import {PriceModel_Coingecko} from '../../models/fetchers/PriceModel_Coingecko.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';

export type CoingeckoDataRepositoryInput = {
  params: CoingeckoPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class CoingeckoDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_Coingecko);
    this.logPrefix = '[CoingeckoDataRepository]';
  }

  async save(dataArr: CoingeckoDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_Coingecko[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.CoingeckoPrice,
          params.id.toLowerCase(),
          params.currency.toLowerCase(),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        id: params.id,
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

  async getPrices(params: CoingeckoPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
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
    sortedResults: PriceModel_Coingecko[],
    inputs: CoingeckoPriceInputParams[],
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
