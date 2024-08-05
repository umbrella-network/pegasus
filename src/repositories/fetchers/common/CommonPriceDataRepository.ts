import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../../types/Settings.js';
import {FetcherName} from '../../../types/fetchers.js';
import PriceSignerService from '../../../services/PriceSignerService.js';

@injectable()
export abstract class CommonPriceDataRepository {
  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(PriceSignerService) protected priceSignerService!: PriceSignerService;

  protected priceTimeWindow = 20; // TODO time limit

  protected createMessageToSign(
    value: number | bigint,
    timestamp: number,
    hashVersion: number,
    fetcherName: FetcherName,
    ...data: string[]
  ): string {
    const dataToSign = [value.toString(10), hashVersion.toString(), fetcherName, timestamp.toString(), ...data];
    return dataToSign.join(';');
  }
}
