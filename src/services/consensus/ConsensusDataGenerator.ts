// take in feeds and data
// apply calculators
// generate leaves

import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Leaf from '../../types/Leaf';
import {FeedData, FeedDatum} from './FeedDataLoader';
import {Feed} from '../../types/Feed';
import {LeafFactory} from '../LeafFactory';

export type ConsensusDataGeneratorProps = {
  feeds: Feed[];
  data: FeedData;
};

@injectable()
export class ConsensusDataGenerator {
  @inject('Logger') logger!: Logger;
  @inject(LeafFactory) leafFactory!: LeafFactory;

  async apply(props: ConsensusDataGeneratorProps): Promise<Leaf[]> {
    const result: Leaf[] = [];

    for (const feed of props.feeds) {
      if (!feed.symbol) continue;

      const data = props.data[feed.symbol];
      if (!data || data.length === 0) continue;

      result.push(this.leafFactory.buildFromFeedData({label: feed.symbol, feed, data}));
    }

    return result;
  }
}
