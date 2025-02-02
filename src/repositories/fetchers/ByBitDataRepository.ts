import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FeedPrice, FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {ByBitPriceInputParams} from '../../services/fetchers/ByBitPriceGetter.js';
import {PriceModel_ByBit} from '../../models/fetchers/PriceModel_ByBit.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';

export type ByBitDataRepositoryInput = {
  params: ByBitPriceInputParams;
  value: number;
  usdIndexPrice?: number;
  timestamp: number;
};

@injectable()
export class ByBitDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_ByBit);
    this.logPrefix = '[ByBitDataRepository]';
  }

  async save(dataArr: ByBitDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_ByBit[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, usdIndexPrice, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.ByBitPrice,
          params.symbol,
          usdIndexPrice === undefined ? '' : usdIndexPrice.toString(10),
        );
        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, usdIndexPrice, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        symbol: params.symbol,
        value: value.toString(),
        usdIndexPrice: usdIndexPrice ?? null,
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

  async getPrices(params: ByBitPriceInputParams[], timestamp: number): Promise<FeedPrice[]> {
    if (params.length === 0) {
      return [];
    }

    const results = await this.model
      .find(
        {
          symbol: {$in: params.map((p) => p.symbol.toLowerCase())},
          timestamp: this.getTimestampWindowFilter(timestamp),
          usdIndexPrice: {$ne: null},
        },
        {value: 1, usdIndexPrice: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(sortedResults: PriceModel_ByBit[], inputs: ByBitPriceInputParams[]): FeedPrice[] {
    const map: Record<string, number> = {};
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    sortedResults.forEach(({symbol, usdIndexPrice}) => {
      if (map[symbol] || !usdIndexPrice) return; // already set newest price

      map[symbol] = usdIndexPrice;
    });

    const newest = inputs.map(({symbol}) => map[symbol.toLowerCase()]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);

    return newest.map((price) => {
      return {value: price};
    });
  }
}
