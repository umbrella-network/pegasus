import {inject, injectable} from 'inversify';
import dayjs from 'dayjs';
import {getModelForClass} from '@typegoose/typegoose';

import Settings from '../types/Settings.js';
import {FetcherHistory} from '../models/FetcherHistory.js';
import {FetcherHistoryInterface} from '../types/fetchers.js';

@injectable()
export class FetcherHistoryRepository {
  @inject('Settings') settings!: Settings;

  async save(props: FetcherHistoryInterface): Promise<void> {
    const expireAt = dayjs().add(this.settings.fetcherHistory.ttl, 'second').toDate();
    const doc = await getModelForClass(FetcherHistory).create({...props, expireAt});
    await doc.save();
  }

  async saveMany(props: FetcherHistoryInterface[]): Promise<void> {
    const expireAt = dayjs().add(this.settings.fetcherHistory.ttl, 'second').toDate();
    await getModelForClass(FetcherHistory).bulkWrite(
      props.map((p) => {
        return {...p, expireAt};
      }),
    );
  }
}
