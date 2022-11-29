// take in feeds and data
// apply calculators
// generate leaves

import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Leaf from '../../types/Leaf';
import {FeedDatum} from './FeedDataLoader';
import {Feed} from '../../types/Feed';
import {LeafFactory} from '../LeafFactory';

export type ConsensusDataGeneratorProps = {
  feeds: Feed[];
  data: Map<string, FeedDatum[]>;
};

@injectable()
export class ConsensusDataGenerator {
  @inject('Logger') logger!: Logger;
  @inject(LeafFactory) leafFactory!: LeafFactory;

  async apply(props: ConsensusDataGeneratorProps): Promise<Leaf[]> {
    const result: Leaf[] = [];

    props.data.forEach((data, i: string) => {
      let feed = props.feeds.find((value) => value.symbol === i);

      if (i.includes('SN_')) {
        const optionPriceFeed = i.split('_')[1].split('-')[0];
        feed = props.feeds.find((value) => value.symbol === `OP:${optionPriceFeed}-*`);
      }

      if (!feed) {
        console.log('[ConsensusDataGenerator] no feed found, continue', i);
        return;
      }

      result.push(this.leafFactory.buildFromFeedData({label: i, feed, data}));
    });

    return result;
  }
}
