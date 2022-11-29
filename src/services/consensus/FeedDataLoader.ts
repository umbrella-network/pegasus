import {inject, injectable} from 'inversify';

import {Feed} from '../../types/Feed';
import {getModelForClass} from '@typegoose/typegoose';
import {Price} from '../../models/Price';
import {Datum} from '../../models/Datum';
import Settings from 'src/types/Settings';

export type FeedDataLoaderProps = {
  timestamp: number;
  feeds: Feed[];
};

export type FeedDatum = {
  source: string;
  type?: string;
  value: string | number;
  timestamp: Date;
};

// key = feed symbol
export type FeedData = {
  [key: string]: FeedDatum[];
};

@injectable()
export class FeedDataLoader {
  @inject('Settings') settings!: Settings;

  async apply(props: FeedDataLoaderProps): Promise<FeedData> {
    const freshness = this.settings.api.priceFreshness;
    // load prices & data
    const startsAt = new Date((props.timestamp - freshness) * 1000);
    const endsAt = new Date(props.timestamp * 1000);

    const [prices, data] = await Promise.all([
      this.getData<Price>({model: Price, startsAt, endsAt}),
      this.getData<Datum>({model: Datum, startsAt, endsAt}),
    ]);

    // TODO: consider injecting Uniswap here
    const pricesGrouped = this.groupAndFilterBySymbol<Price>({data: prices});
    const dataGrouped = this.groupAndFilterBySymbol<Datum>({data});

    return {...pricesGrouped, ...dataGrouped};
  }

  private async getData<T>(props: {model: new () => T; startsAt: Date; endsAt: Date}): Promise<T[]> {
    console.log('[FeedDataLoader] props.startsAt, $lt: props.endsAt}', props.startsAt, props.endsAt);
    return await getModelForClass(props.model)
      .aggregate([
        {
          $match: {
            timestamp: {$gte: props.startsAt, $lt: props.endsAt},
          },
        },
        {
          $sort: {timestamp: 1},
        },
        {
          $group: {
            _id: {source: '$source', symbol: '$symbol'},
            doc: {$last: '$$ROOT'},
          },
        },
        {
          $replaceRoot: {newRoot: '$doc'},
        },
      ])
      .exec();
  }

  private groupAndFilterBySymbol<T extends Datum | Price>(props: {data: T[]}): FeedData {
    console.log('GROUP and props.data: ', JSON.stringify(props.data));
    const feedData = props.data.reduce((acc, e) => {
      (acc[e.symbol.replace('~', '-')] ||= []).push({
        source: e.source,
        value: e.value,
        timestamp: e.timestamp,
      });
      return acc;
    }, <FeedData>{});

    console.log('[FeedDataLoader] feedData: ', JSON.stringify(feedData));

    return feedData;
  }
}
