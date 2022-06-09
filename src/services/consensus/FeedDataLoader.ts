import {injectable} from 'inversify';

import {Feed} from '../../types/Feed';
import {getModelForClass} from '@typegoose/typegoose';
import {Price} from '../../models/Price';
import {Datum} from '../../models/Datum';

export type FeedDataLoaderProps = {
  startsAt: Date;
  endsAt: Date;
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
  // Load Prices and Data
  async apply(props: FeedDataLoaderProps): Promise<FeedData> {
    // get active symbols
    const activeSymbols = this.getActiveSymbols(props.feeds);
    // load prices & data
    const [prices, data] = await Promise.all([
      this.getData<Price>({model: Price, startsAt: props.startsAt, endsAt: props.endsAt}),
      this.getData<Datum>({model: Datum, startsAt: props.startsAt, endsAt: props.endsAt}),
    ]);

    // TODO: consider injecting Uniswap here
    const pricesGrouped = this.groupAndFilterBySymbol<Price>({data: prices, activeSymbols});
    const dataGrouped = this.groupAndFilterBySymbol<Datum>({data, activeSymbols});

    return {...pricesGrouped, ...dataGrouped};
  }

  private getActiveSymbols(feeds: Feed[]): Set<string> {
    return feeds.reduce((acc, e) => (e.symbol ? acc.add(e.symbol) : acc), new Set<string>());
  }

  private async getData<T>(props: {model: new () => T; startsAt: Date; endsAt: Date}): Promise<T[]> {
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

  private groupAndFilterBySymbol<T extends Datum | Price>(props: {data: T[]; activeSymbols: Set<string>}): FeedData {
    const feedData = props.data.reduce((acc, e) => {
      if (!props.activeSymbols.has(e.symbol.replace('~', '-').toUpperCase())) return acc;

      (acc[e.symbol.replace('~', '-').toUpperCase()] ||= []).push({
        source: e.source,
        value: e.value,
        timestamp: e.timestamp,
      });
      return acc;
    }, <FeedData>{});

    return feedData;
  }
}
