import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {ethers} from 'ethers';

import {FetcherName, FetchedValueType, StringOrUndefined} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {OnChainDataModel} from '../../models/fetchers/OnChainDataModel.js';
import {OnChainDataInputParams} from '../../services/fetchers/OnChainDataFetcher';

export type OnChainDataRepositoryInput = {
  params: OnChainDataInputParams;
  value: string;
  timestamp: number;
};

@injectable()
export class OnChainDataRepository extends CommonPriceDataRepository {
  constructor() {
    super();
    this.model = getModelForClass(OnChainDataModel);
    this.logPrefix = '[OnChainDataRepository]';
  }

  async save(dataArr: OnChainDataRepositoryInput[]): Promise<void> {
    const payloads: OnChainDataModel[] = [];

    const signatures = await Promise.all(
      dataArr.map(({params, value, timestamp}) => {
        const messageToSign = this.createMessageToSign(
          value,
          timestamp,
          this.hashVersion,
          FetcherName.OnChainData,
          params.chainId as string,
          params.address,
          params.method,
          ...params.args,
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        chainId: params.chainId as string,
        targetAddress: params.address,
        method: params.method,
        inputArgs: params.args,
        value,
        valueType: FetchedValueType.Hex,
        timestamp,
        hashVersion,
        signature,
        priceHash: hash,
        signer: signerAddress,
      });
    });

    await this.savePrices(payloads);
  }

  async getData(params: OnChainDataInputParams[], timestamp: number): Promise<StringOrUndefined[]> {
    const or = params.map((param) => {
      return {
        chainId: param.chainId,
        targetAddress: param.address,
        method: param.method,
        inputArgs: param.args,
      };
    });

    const results = await this.model
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestData(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestData(sortedResults: OnChainDataModel[], inputs: OnChainDataInputParams[]): StringOrUndefined[] {
    const map: Record<string, string> = {};

    const getSymbol = (chainId: string, targetAddress: string, method: string, args: string[]) =>
      ethers.utils.id([chainId, targetAddress, method, ...args].join(';'));

    sortedResults.forEach((data) => {
      const key = getSymbol(data.chainId, data.targetAddress, data.method, data.inputArgs);
      if (map[key]) return; // already set newest price

      map[key] = data.value;
    });

    return inputs.map((data) => {
      const key = getSymbol((data.chainId as string).toLowerCase(), data.address.toLowerCase(), data.method, data.args);

      return map[key];
    });
  }
}
