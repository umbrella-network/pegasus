import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CoingeckoPriceInputParams} from '../../services/fetchers/CoingeckoPriceFetcher.js';
import {CoingeckoPriceModel} from '../../models/fetchers/CoingeckoPriceModel.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';

export type CoingeckoDataRepositoryInput = {
  params: CoingeckoPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class CoingeckoDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[CoingeckoDataRepository]';

  constructor() {
    super();
    this.model = getModelForClass(CoingeckoPriceModel);
  }

  async save(dataArr: CoingeckoDataRepositoryInput[]): Promise<void> {
    const payloads: CoingeckoPriceModel[] = [];

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
      });
    });

    await this.savePrices(payloads);
  }

  private async savePrices(data: CoingeckoPriceModel[]): Promise<void> {
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

  async getPrices(params: CoingeckoPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({id, currency}) => {
      return {id, currency};
    });

    const results = await this.model
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1, id: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: CoingeckoPriceModel[],
    inputs: CoingeckoPriceInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};
    const getSymbol = (id: string, currency: string) => `${id}-${currency}`;

    sortedResults.forEach(({id, currency, value}) => {
      const symbol = getSymbol(id, currency);
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({id, currency}) => map[getSymbol(id, currency).toLowerCase()]);
  }
}
