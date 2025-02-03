import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FeedPrice, FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {PriceModel_PolygonIOSingleCrypto} from '../../models/fetchers/PriceModel_PolygonIOSingleCrypto.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PolygonIOSingleCryptoPriceInputParams} from '../../services/fetchers/PolygonIOSingleCryptoPriceGetter.js';

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
    this.model = getModelForClass(PriceModel_PolygonIOSingleCrypto);
    this.logPrefix = '[PolygonIOSingleCryptoDataRepository]';
  }

  async save(dataArr: PolygonIOSingleCryptoDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_PolygonIOSingleCrypto[] = [];

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
        expireAt: this.expireAtDate(),
      });
    });

    await this.savePrices(payloads);
  }

  async getPrices(params: PolygonIOSingleCryptoPriceInputParams[], timestamp: number): Promise<FeedPrice[]> {
    if (params.length === 0) {
      return [];
    }

    const results = await this.model
      .find(
        {
          symbol: {$in: params.map(({fsym, tsym}) => `${fsym}-${tsym}`.toLowerCase())},
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
    sortedResults: PriceModel_PolygonIOSingleCrypto[],
    inputs: PolygonIOSingleCryptoPriceInputParams[],
  ): FeedPrice[] {
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const map: Record<string, number> = {};

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    const newest = inputs.map(({fsym, tsym}) => map[`${fsym}-${tsym}`.toLowerCase()]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);

    return newest.map((price) => {
      return {value: price};
    });
  }
}
