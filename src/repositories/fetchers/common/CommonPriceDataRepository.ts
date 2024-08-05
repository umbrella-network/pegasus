import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../../types/Settings.js';
import {FetcherName} from '../../../types/fetchers.js';

@injectable()
export abstract class CommonPriceDataRepository {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;

  protected priceTimeWindow = 20; // TODO time limit

  protected createMessageToSign(
    value: number,
    timestamp: number,
    hashVersion: number,
    fetcherName: FetcherName,
    ...data: string[]
  ): string {
    const dataToSign = [hashVersion.toString(), value.toString(10), timestamp.toString(), fetcherName, ...data];

    return dataToSign.join(';');
  }
}
