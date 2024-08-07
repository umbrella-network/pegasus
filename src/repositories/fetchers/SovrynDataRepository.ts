import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, FetchedValueType, NumberOrUndefined} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {SovrynDataModel} from '../../models/fetchers/SovrynDataModel.js';
import {SovrynPriceInputParams} from '../../services/dexes/sovryn/SovrynPriceFetcher.js';
import {ChainsIds} from '../../types/ChainsIds.js';

export type SovrynDataRepositoryInput = {
  params: SovrynPriceInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class SovrynDataRepository extends CommonPriceDataRepository {
  private logPrefix = '[SovrynDataRepository]';

  async save(dataArr: SovrynDataRepositoryInput[]): Promise<void> {
    const payloads: SovrynDataModel[] = [];

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
      });
    });

    await this.savePrices(payloads);
  }

  private async savePrices(data: SovrynDataModel[]): Promise<void> {
    const model = getModelForClass(SovrynDataModel);

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

  async getPrices(params: SovrynPriceInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map((param) => {
      return {
        chainId: ChainsIds.ROOTSTOCK,
        base: param.base,
        quote: param.quote,
      };
    });

    const results = await getModelForClass(SovrynDataModel)
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestData(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestData(sortedResults: SovrynDataModel[], inputs: SovrynPriceInputParams[]): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    const getSymbol = (chainId: string, base: string, quote: string) => [chainId, base, quote].join(';');

    sortedResults.forEach((data) => {
      const key = getSymbol(data.chainId, data.base, data.quote);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(data.value);
    });

    return inputs.map((data) => {
      const key = getSymbol(
        (ChainsIds.ROOTSTOCK as string).toLowerCase(),
        data.base.toLowerCase(),
        data.quote.toLowerCase(),
      );

      return map[key];
    });
  }
}
