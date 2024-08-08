import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ReturnModelType} from '@typegoose/typegoose';
import {BeAnObject} from '@typegoose/typegoose/lib/types';

import Settings from '../../../types/Settings.js';
import {FetcherName} from '../../../types/fetchers.js';
import PriceSignerService from '../../../services/PriceSignerService.js';

@injectable()
export abstract class CommonPriceDataRepository {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;

  private priceTimeWindow = 10; // TODO time window, configurable?
  protected hashVersion = 1;

  // this is definition from @typegoose
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected model!: ReturnModelType<any, BeAnObject>;
  protected logPrefix = '';

  constructor() {
    this.logPrefix = '[CommonPriceDataRepository]';
  }

  protected getTimestampWindowFilter(timestamp: number) {
    return {$gte: timestamp - this.priceTimeWindow, $lte: timestamp + this.priceTimeWindow};
  }

  protected createMessageToSign(
    value: number | bigint | string,
    timestamp: number,
    hashVersion: number,
    fetcherName: FetcherName,
    ...data: string[]
  ): string {
    const strValue = typeof value === 'string' ? value : value.toString(10);
    const dataToSign = [strValue, hashVersion.toString(), fetcherName, timestamp.toString(), ...data];
    return dataToSign.join(';');
  }

  protected async savePrices<T>(data: T[]): Promise<void> {
    try {
      await this.model.bulkWrite(
        data.map((doc) => {
          return {insertOne: {document: doc}};
        }),
      );
    } catch (error) {
      this.logger.error(`${this.logPrefix} couldn't perform bulkWrite: ${error}`);
    }
  }
}
