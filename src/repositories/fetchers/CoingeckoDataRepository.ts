import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';

import {FetcherName, NumberOrUndefined, PriceValueType} from '../../types/fetchers.js';
import PriceSignerService from '../../services/PriceSignerService.js';
import Settings from '../../types/Settings.js';
import {CoingeckoPriceInputParams} from '../../services/fetchers/CoingeckoPriceFetcher.js';
import {CoingeckoPriceModel} from '../../models/fetchers/CoingeckoPriceModel.js';

export type CoingeckoDataRepositoryInput = {
  params: CoingeckoPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class CoingeckoDataRepository {
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;

  private logPrefix = '[CoingeckoDataRepository]';

  async save(dataArr: CoingeckoDataRepositoryInput[]): Promise<void> {
    const payloads: CoingeckoPriceModel[] = [];
    const hashVersion = 1;

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(params, value, timestamp, hashVersion);
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

  private createMessageToSign(
    data: CoingeckoPriceInputParams,
    value: number,
    timestamp: number,
    hashVersion: number,
  ): string {
    const dataToSign = [
      hashVersion.toString(),
      FetcherName.CoingeckoPrice,
      data.id.toLowerCase(),
      data.currency.toLowerCase(),
      value.toString(10),
      timestamp.toString(),
    ];

    return dataToSign.join(';');
  }

  async getPrices(params: CoingeckoPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({id, currency}) => {
      return {id, currency};
    });

    const results = await getModelForClass(CoingeckoPriceModel)
      .find({$or: or, timestamp: {$gte: timestamp - 60}}, {value: 1, id: 1, currency: 1}) // TODO time limit
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
