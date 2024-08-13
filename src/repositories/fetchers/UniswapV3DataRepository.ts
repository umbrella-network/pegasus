import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import {FetcherName, FetchedValueType, NumberOrUndefined} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {PriceModel_UniswapV3} from '../../models/fetchers/PriceModel_UniswapV3.js';
import {UniswapV3FetcherInputParams} from '../../services/dexes/uniswapV3/UniswapV3Fetcher.js';

export type UniswapV3DataRepositoryInput = {
  params: UniswapV3FetcherInputParams;
  value: number;
  timestamp: number;
};

@injectable()
export class UniswapV3DataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(PriceModel_UniswapV3);
    this.logPrefix = '[UniswapV3DataRepository]';
  }

  async save(dataArr: UniswapV3DataRepositoryInput[]): Promise<void> {
    const payloads: PriceModel_UniswapV3[] = [];

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
        chainId: params.fromChain,
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

  async getPrices(params: UniswapV3FetcherInputParams[], timestamp: number): Promise<NumberOrUndefined[]> {
    const or = params.map((param) => {
      return {
        chainId: param.fromChain,
        base: param.base,
        quote: param.quote,
      };
    });

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)}, {value: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestData(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestData(
    sortedResults: PriceModel_UniswapV3[],
    inputs: UniswapV3FetcherInputParams[],
  ): NumberOrUndefined[] {
    const map: Record<string, number> = {};

    const getSymbol = (chainId: string, base: string, quote: string) => [chainId, base, quote].join(';');

    sortedResults.forEach((data) => {
      const key = getSymbol(data.chainId, data.base, data.quote);
      if (map[key]) return; // already set newest price

      map[key] = parseFloat(data.value);
    });

    return inputs.map((data) => {
      const key = getSymbol(data.fromChain.toLowerCase(), data.base.toLowerCase(), data.quote.toLowerCase());

      return map[key];
    });
  }
}
