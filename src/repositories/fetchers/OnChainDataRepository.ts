import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {ethers} from 'ethers';

import {FetchedValueType, FetcherName, StringOrUndefined} from '../../types/fetchers.js';
import {CommonPriceDataRepository} from './common/CommonPriceDataRepository.js';
import {DataModel_OnChain} from '../../models/fetchers/DataModel_OnChain.js';
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
    this.model = getModelForClass(DataModel_OnChain);
    this.logPrefix = '[OnChainDataRepository]';
  }

  async save(dataArr: OnChainDataRepositoryInput[]): Promise<void> {
    const payloads: DataModel_OnChain[] = [];

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
        expireAt: this.expireAtDate(),
      });
    });

    await this.savePrices(payloads);
  }

  async getData(params: OnChainDataInputParams[], timestamp: number): Promise<StringOrUndefined[]> {
    if (params.length === 0) {
      return [];
    }

    const or = params.map((param) => {
      return {
        chainId: param.chainId?.toLowerCase(),
        targetAddress: param.address.toLowerCase(),
        method: param.method,
        inputArgs: param.args,
      };
    });

    const results = await this.model
      .find({$or: or, timestamp: this.getTimestampWindowFilter(timestamp)})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestData(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestData(sortedResults: DataModel_OnChain[], inputs: OnChainDataInputParams[]): StringOrUndefined[] {
    this.logger.debug(
      `${this.logPrefix} results (${sortedResults.length}): ${sortedResults.map((r) => r.value).join(';')}`,
    );

    const map: Record<string, string> = {};

    const getSymbol = (chainId: string, targetAddress: string, method: string, args: string[]) =>
      ethers.utils.id([chainId, targetAddress, method, ...args].join(';'));

    sortedResults.forEach((data) => {
      const key = getSymbol(data.chainId, data.targetAddress, data.method, data.inputArgs);
      if (map[key]) return; // already set newest price

      map[key] = data.value;
    });

    const newest = inputs.map((data) => {
      const key = getSymbol((data.chainId as string).toLowerCase(), data.address.toLowerCase(), data.method, data.args);

      return map[key];
    });

    this.logger.debug(`${this.logPrefix} newest (${newest.filter((n) => !!n).length}): ${newest.filter((n) => !!n)}`);
    return newest;
  }
}
