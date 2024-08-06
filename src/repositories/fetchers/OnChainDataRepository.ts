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
  private logPrefix = '[OnChainDataRepository]';

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
          this.createInputDataHash(params),
        );

        return this.priceSignerService.sign(messageToSign);
      }),
    );

    dataArr.forEach(({value, params, timestamp}, ix) => {
      const {signerAddress, signature, hash, hashVersion} = signatures[ix];

      payloads.push({
        chainId: params.chainId as string,
        targetAddress: params.address,
        inputDataHash: this.createInputDataHash(params),
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

  private createInputDataHash(data: OnChainDataInputParams): string {
    const msg = [
      data.method,
      ...data.inputs,
      ...data.args,
      data.returnIndex === undefined ? '' : data.returnIndex.toString(),
    ];

    return ethers.utils.id(msg.join(';'));
  }

  private async savePrices(data: OnChainDataModel[]): Promise<void> {
    const model = getModelForClass(OnChainDataModel);

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

  async getData(params: OnChainDataInputParams[], timestamp: number): Promise<StringOrUndefined[]> {
    const or = params.map((param) => {
      return {
        chainId: param.chainId,
        targetAddress: param.address,
        inputDataHash: this.createInputDataHash(param),
      };
    });

    const results = await getModelForClass(OnChainDataModel)
      .find({$or: or, timestamp: {$gte: timestamp - this.priceTimeWindow}}, {value: 1})
      .sort({timestamp: -1})
      .exec();

    return this.getNewestData(results, params);
  }

  // sortedResults must be sorted by timestamp in DESC way
  private getNewestData(sortedResults: OnChainDataModel[], inputs: OnChainDataInputParams[]): StringOrUndefined[] {
    const map: Record<string, string> = {};
    const getSymbol = (chainId: string, targetAddress: string, inputDataHash: string) =>
      `${chainId}-${targetAddress}-${inputDataHash}`;

    sortedResults.forEach((data) => {
      const key = getSymbol(data.chainId, data.targetAddress, data.inputDataHash);
      if (map[key]) return; // already set newest price

      map[key] = data.value;
    });

    return inputs.map(
      (data) => map[getSymbol(data.chainId as string, data.address, this.createInputDataHash(data)).toLowerCase()],
    );
  }
}
