import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, PriceValueType} from '../../types/fetchers.js';
import PriceSignerService from '../../services/PriceSignerService.js';
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
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;

  private logPrefix = '[CoingeckoDataRepository]';

  async save(dataArr: CoingeckoDataRepositoryInput[]): Promise<void> {
    const payloads: CoingeckoPriceModel[] = [];
    const hashVersion = 1;

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          hashVersion,
          FetcherName.CoingeckoPrice,
          params.id.toLowerCase(),
          params.currency.toLowerCase(),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash} = signatures[ix];

      payloads.push({
        id: params.id,
        currency: params.currency,
        value: value.toString(),
        valueType: PriceValueType.Price,
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
    const model = getModelForClass(CoingeckoPriceModel);

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

  async getPrices(params: CoingeckoPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({id, currency}) => {
      return {id, currency};
    });

    const results = await getModelForClass(CoingeckoPriceModel)
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1, id: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.generateResults(results, params);
  }

  private generateResults(results: CoingeckoPriceModel[], inputs: CoingeckoPriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    const getSymbol = (id: string, currency: string) => `${id}-${currency}`;

    results.forEach(({id, currency, value}) => {
      const symbol = getSymbol(id, currency);

      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({id, currency}) => map[getSymbol(id, currency).toLowerCase()]);
  }
}
