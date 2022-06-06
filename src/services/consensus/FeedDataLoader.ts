import {injectable} from 'inversify';
import {Feed} from '../../types/Feed';
import {getModelForClass} from '@typegoose/typegoose';
import {Price} from '../../models/Price';

export type FeedDataLoaderProps = {
  startsAt: Date;
  endsAt: Date;
  feeds: Feed[];
}

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
    // TODO: add support for Datum
    // load prices & data
    const [prices] = await Promise.all([
      this.getData<Price>({ model: Price, startsAt: props.startsAt, endsAt: props.endsAt })
    ]);
    // load data
    return this.groupAndFilterBySymbol({prices, activeSymbols});
  }

  private getActiveSymbols(feeds: Feed[]): Set<string> {
    return feeds
      .reduce((acc, e) => (e.symbol ? acc.add(e.symbol) : acc), new Set<string>());
  }

  private async getData<T>(props: {model: typeof Price, startsAt: Date, endsAt: Date}): Promise<T[]> {
    return await getModelForClass(props.model)
      .aggregate([
        {
          $match: {
            timestamp: {$gte: props.startsAt, $lt: props.endsAt} // TODO: check if we should use $lte
          }
        },
        {
          $sort: {timestamp: 1}
        },
        {
          $group: {
            _id: {source: '$source', symbol: '$symbol'},
            doc: {$last: '$$ROOT'} // TODO: check if this is returning the latest
          }
        },
        {
          $replaceRoot: {$newRoot: '$doc'}
        }
      ]).exec();
  }

  // TODO: add Datum support
  private groupAndFilterBySymbol(props: {prices: Price[], activeSymbols: Set<string>}): FeedData {
    const feedData = props.prices
      .reduce(
        (acc, e) => {
          if (!props.activeSymbols.has(e.symbol)) return acc;

          (acc[e.symbol] ||= []).push({source: e.source, value: e.value, timestamp: e.timestamp})
          return acc
        },
        <FeedData> {}
      );

    return feedData;
  }
}
