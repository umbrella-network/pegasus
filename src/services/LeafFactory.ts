import {injectable} from 'inversify';
import Leaf from '../types/Leaf';
import {Feed, FeedValue} from '../types/Feed';
import {FeedDatum} from './consensus/FeedDataLoader';
import {LeafValueCoder} from '@umb-network/toolbox';
import {price} from '@umb-network/validator';

@injectable()
export class LeafFactory {
  buildFromFeedData(props: {label: string; feed: Feed; data: FeedDatum[]}): Leaf {
    const {label, feed, data} = props;
    if (this.isFixedValue(label, data)) return this.buildLeaf(label, data[0].value);

    return this.buildLeaf(label, this.resolveValue(feed, data));
  }

  private isFixedValue(label: string, data: FeedDatum[]): boolean {
    return data.length == 1 && LeafValueCoder.isFixedValue(label);
  }

  private buildLeaf(label: string, value: FeedValue): Leaf {
    return {
      label,
      valueBytes: `0x${LeafValueCoder.encode(value, label).toString('hex')}`,
    };
  }

  private resolveValue(feed: Feed, data: FeedDatum[]): number {
    const values = data.filter((d) => typeof d.value == 'number').map((d) => d.value as number);
    return this.calculateMean(values, feed.precision);
  }

  private calculateMean(values: number[], precision: number): number {
    const multi = Math.pow(10, precision);
    return Math.round(price.mean(values) * multi) / multi;
  }
}
