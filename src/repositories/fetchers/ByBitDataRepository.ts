import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';

import {FetcherName, NumberOrUndefined, PriceValueType} from '../../types/fetchers.js';
import PriceSignerService from '../../services/PriceSignerService.js';
import Settings from '../../types/Settings.js';
import {ByBitPriceInputParams} from '../../services/fetchers/ByBitPriceFetcher.js';
import {ByBitPriceModel} from 'src/models/fetchers/ByBitPriceModel.js';

export type ByBitDataRepositoryInput = {
  params: ByBitPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class ByBitDataRepository {
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;

  private logPrefix = '[ByBitDataRepository]';

  async save(dataArr: ByBitDataRepositoryInput[]): Promise<void> {
    const payloads: ByBitPriceModel[] = [];
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
        symbol: params.symbol,
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

  private async savePrices(data: ByBitPriceModel[]): Promise<void> {
    const model = getModelForClass(ByBitPriceModel);

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
    data: ByBitPriceInputParams,
    value: number,
    timestamp: number,
    hashVersion: number,
  ): string {
    const dataToSign = [
      hashVersion.toString(),
      FetcherName.CoingeckoPrice,
      data.symbol,
      value.toString(10),
      timestamp.toString(),
    ];

    return dataToSign.join(';');
  }

  async getPrices(params: ByBitPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({symbol}) => {
      return {symbol};
    });

    const results = await getModelForClass(ByBitPriceModel)
      .find({$or: or, timestamp: {$gte: timestamp - 60}}, {value: 1, symbol: 1}) // TODO time limit
      .sort({timestamp: -1})
      .exec();

    return this.generateResults(results, params);
  }

  private generateResults(results: ByBitPriceModel[], inputs: ByBitPriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    results.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({symbol}) => map[symbol.toLowerCase()]);
  }
}
