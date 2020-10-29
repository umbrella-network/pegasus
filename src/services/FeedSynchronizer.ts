import { getModelForClass } from '@typegoose/typegoose';
import axios from 'axios';
import { injectable } from 'inversify';
import { uuid } from 'uuidv4';
import { JSONPath } from 'jsonpath-plus';
import Leaf from '../models/Leaf';
import Feed from '../models/Feed';

@injectable()
class FeedSynchronizer {
  async apply(feed: Feed): Promise<Leaf[]> {
    const response = await axios.get(feed.sourceUrl);
    const leaf = this.buildLeaf(feed)
    const value = this.extractValue(response.data, feed.valuePath);

    if (value) {
      leaf.value = value;
      await this.save(leaf);
      return [leaf];
    } else {
      return [];
    }
  }

  private buildLeaf = (feed: Feed): Leaf => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.feedId = feed._id;
    leaf.label = feed.leafLabel;
    return leaf;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number | undefined => {
    const match: number[] | null = JSONPath({ json: data, path: valuePath });
    if (match) return match[0];
  }

  private save = async (leaf: Leaf): Promise<void> => {
    getModelForClass(Leaf).create(leaf);
  }
}

export default FeedSynchronizer;
