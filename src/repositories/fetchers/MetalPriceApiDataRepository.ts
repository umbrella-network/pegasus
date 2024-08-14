import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_MetalPriceApi} from '../../models/fetchers/PriceModel_MetalPriceApi.js';
import {MetalPriceApiInputParams} from '../../services/fetchers/MetalPriceApiFetcher.js';

export type MetalPriceApiDataRepositoryInput = {
  params: MetalPriceApiInputParams;
  value: number;
  timestamp: number;
};

// TODO 2024-08-06T13:43:11.854Z error: [MetalPriceApi] An error occurred while fetching metal prices: TypeError:
//  Cannot read properties of undefined (reading 'XAU')
@injectable()
export class MetalPriceApiDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_MetalPriceApi);
    this.logPrefix = '[MetalPriceApiDataRepository]';
  }

  async save(dataArr: MetalPriceApiDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_MetalPriceApi[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.MetalPriceApi,
          params.symbol,
          params.currency,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
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

  async getPrices(params: MetalPriceApiInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map(({symbol, currency}) => {
      return {symbol: symbol.toLowerCase(), currency: currency.toLowerCase()};
    });

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1, symbol: 1, currency: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PriceModel_MetalPriceApi[],
    inputs: MetalPriceApiInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};
    const getSymbol = (symbol: string, currency: string) => `${symbol}-${currency}`;

    sortedResults.forEach(({symbol, currency, value}) => {
      const key = getSymbol(symbol, currency);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(value);
    });

    return inputs.map(({symbol, currency}) => map[getSymbol(symbol, currency).toLowerCase()]);
  }
}
