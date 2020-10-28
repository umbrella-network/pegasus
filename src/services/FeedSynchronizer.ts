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
    leaf.value = this.extractValue(response.data, feed.valuePath);
    await this.save(leaf);
    return [leaf];
  }

  private buildLeaf = (feed: Feed): Leaf => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.feedId = feed._id;
    leaf.label = feed.leafLabel;
    return leaf;
  }

  private extractValue = (data: object, valuePath: string): number => {
    return JSONPath({ json: data, path: valuePath });
  }

  private save = async (leaf: Leaf): Promise<void> => {
    getModelForClass(Leaf).create(leaf);
  }
}

export default FeedSynchronizer;
