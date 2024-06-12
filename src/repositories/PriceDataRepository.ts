import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Logger} from 'winston';
import {PriceDataModel} from 'src/models/PriceDataModel.js';

import Settings from '../types/Settings.js';

export type PriceDataPayload = {
  fetcher: string;
  value: string;
  timestamp: number; // timestamp stamp associated with the value (not the timestamp to when it is stored)
  symbol: string; // symbol configurable on feeds.yaml
  chainId: string; // if the price is associated with a particular dex in a blockchain
};

@injectable()
export class PriceDataRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') private logger!: Logger;

  async savePrice(data: PriceDataPayload): Promise<void> {
    const doc = await getModelForClass(PriceDataModel).create({...data});
    await doc.save();
  }
}
