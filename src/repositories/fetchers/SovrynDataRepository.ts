import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FeedPrice, FetchedValueType, FetcherName} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_Sovryn} from '../../models/fetchers/PriceModel_Sovryn.js';
import {SovrynPriceInputParams} from '../../services/fetchers/SovrynPriceGetter.js';
import {ChainsIds} from '../../types/ChainsIds.js';

export type SovrynDataRepositoryInput = {
  params: SovrynPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class SovrynDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_Sovryn);
    this.logPrefix = '[SovrynDataRepository]';
  }

  async save(dataArr: SovrynDataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_Sovryn[] = [];

    const signatures = await Promise.all(
      dataArr.map(({params, value, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.OnChainData,
          params.base,
          params.quote,
          params.amountInDecimals.toString(10),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        chainId: ChainsIds.ROOTSTOCK,
        base: params.base,
        quote: params.quote,
        amountInDecimals: params.amountInDecimals,
        value: value.toString(10),
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

  async getPrices(params: SovrynPriceInputParams[], timestamp: number): Promise<FeedPrice[]> {
    if (params.length === 0) {
      return [];
    }

    const or = params.map((param) => {
      return {
        chainId: ChainsIds.ROOTSTOCK.toLowerCase(),
        base: param.base.toLowerCase(),
        quote: param.quote.toLowerCase(),
        amountInDecimals: param.amountInDecimals,
      };
    });

    this.logger.debug(
      `${this.logPrefix} find: ${JSON.stringify(or)}, ${JSON.stringify(this.getTimestampWindowFilter(timestamp))}`,
    );

    const results: PriceModel_Sovryn[] = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestData(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestData(sortedResults: PriceModel_Sovryn[], inputs: SovrynPriceInputParams[]): FeedPrice[] {
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const map: Record<string, number> = {};

    const getSymbol = (chainId: string, base: string, quote: string, decimals: number) =>
      [chainId, base, quote, decimals.toString()].join(';').toLowerCase();

    sortedResults.forEach((data) => {
      const key = getSymbol(data.chainId, data.base, data.quote, data.amountInDecimals);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(data.value);
    });

    const newest = inputs.map((data) => {
      const key = getSymbol(ChainsIds.ROOTSTOCK as string, data.base, data.quote, data.amountInDecimals);
      return map[key];
    });

    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);

    return newest.map((price) => {
      return {value: price};
    });
  }
}
