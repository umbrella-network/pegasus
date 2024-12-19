import {injectable} from 'inversify';

import {FetcherName, FetchedValueType, FeedPrice} from '../../../types/fetchers.js';
import {CommonPriceDataRepository} from './CommonPriceDataRepository.js';

export type SymbolDataRepositoryInput = {
  value: number;
  timestamp: number;
  params: {symbol: string};
};

@injectable()
export abstract class SymbolDataRepository extends CommonPriceDataRepository {
  // OVERRIDE constructor:
  // constructor() {
  //   super();
  //   this.model = getModelForClass(PriceModel_Binance);
  //   this.logPrefix = '[SymbolDataRepository]';
  // }

  // PriceModel eg. PriceModel_Binance
  async save<PriceModel>(dataArr: SymbolDataRepositoryInput[], fetcherName: FetcherName): Promise<void> {
    const payloads: PriceModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({value, params, timestamp}) => {
        const messageToSign = this.createMessageToSign(value, timestamp, this.hashVersion, fetcherName, params.symbol);

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push(<PriceModel>{
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

  // InputParams from price getter eg. BinancePriceInputParams
  async getPrices(params: {symbol: string}[], timestamp: number): Promise<FeedPrice[]> {
    if (params.length === 0) {
      return [];
    }

    const results = await this.model
      .find(
        {
          symbol: {$in: params.map((p) => p.symbol.toLowerCase())},
          timestamp: this.getTimestampWindowFilter(timestamp),
        },
        {value: 1, symbol: 1},
      )
      .sort({timestamp: -1})
      .exec();

    return this.getNewestPrices(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestPrices(sortedResults: {value: string; symbol: string}[], inputs: {symbol: string}[]): FeedPrice[] {
    const map: Record<string, number> = {};

    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    sortedResults.forEach(({symbol, value}) => {
      if (map[symbol]) return; // already set newest price

      map[symbol] = parseFloat(value);
    });

    const newest = inputs.map(({symbol}) => map[symbol.toLowerCase()]);
    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);

    return newest.map((price) => {
      return {value: price};
    });
  }
}
