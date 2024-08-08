import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, NumberOrUndefined, FetchedValueType} from '../../types/fetchers.js';
import {PolygonIOSingleCryptoPriceModel} from '../../models/fetchers/PolygonIOSingleCryptoPriceModel.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PolygonIOSingleCryptoPriceInputParams} from '../../services/fetchers/PolygonIOSingleCryptoPriceFetcher.js';

export type PolygonIOSingleCryptoDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: {
    symbol: string;
  };
};

@injectable()
export class PolygonIOSingleCryptoDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PolygonIOSingleCryptoPriceModel);
    this.logPrefix = '[PolygonIOSingleCryptoDataRepository]';
  }

  async save(dataArr: PolygonIOSingleCryptoDataRepositoryInput[]): Promise<void> {
    const payloads: PolygonIOSingleCryptoPriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.PolygonIOSingleCryptoPrice,
          params.symbol,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
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

  async getPrices(params: PolygonIOSingleCryptoPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const results = await this.model
      .find(
        {
          symbol: {$in: params.map(({fsym, tsym}) => `${fsym}-${tsym}`)},
          timestamp: this.getTimestampWindowFilter(timestamp),
        },
        {value: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(
    sortedResults: PolygonIOSingleCryptoPriceModel[],
    inputs: PolygonIOSingleCryptoPriceInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    return inputs.map(({fsym, tsym}) => map[`${fsym}-${tsym}`.toLowerCase()]);
  }
}
