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

  async apply(props: FeedDataLoaderProps): Promise<Map<string, FeedDatum[]>> {
    const freshness = this.settings.api.priceFreshness;
    // load prices & data
    const startsAt = new Date((props.timestamp - freshness) * 1000);
    const endsAt = new Date(props.timestamp * 1000);

    const [prices, data] = await Promise.all([
      this.getData<Price>({model: Price, startsAt, endsAt}),
      this.getData<Datum>({model: Datum, startsAt, endsAt}),
    ]);

    // TODO: consider injecting Uniswap here
    const feedMap = new Map<string, FeedDatum[]>();
    this.groupAndFilterBySymbol<Price>({data: prices}, feedMap);
    this.groupAndFilterBySymbol<Datum>({data}, feedMap);

    return feedMap;
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

  private groupAndFilterBySymbol<T extends Datum | Price>(
    props: {data: T[]},
    feedMap: Map<string, FeedDatum[]>,
  ): Map<string, FeedDatum[]> {
    props.data.forEach((e) => {
      const symbol = e.symbol.replace('~', '-');

      const value = {
        source: e.source,
        value: e.value,
        timestamp: e.timestamp,
      };

      if (!feedMap.has(symbol)) {
        feedMap.set(symbol, [value]);
        return;
      }

      if (feedMap.has(symbol)) {
        const feedsFromMap = feedMap.get(symbol)!;
        feedsFromMap.push(value);
        feedMap.set(symbol, feedsFromMap);
      }
    });

    console.log('[FeedDataLoader] feedMap: ', JSON.stringify(feedMap));

    return feedMap;
  }
}
