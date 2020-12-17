import { getModelForClass } from '@typegoose/typegoose';
import {inject, injectable} from 'inversify';
import { v4 as uuid } from 'uuid';
import Leaf from '../models/Leaf';
import Feed from '../models/Feed';
import FeedValueResolver from "./FeedValueResolver";

@injectable()
class FeedSynchronizer {
  @inject(FeedValueResolver) feedValueResolver!: FeedValueResolver;

  async apply(feed: Feed): Promise<Leaf[]> {
    const leaf = this.buildLeaf(feed)
    const value = await this.feedValueResolver.apply(feed);

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

  private save = async (leaf: Leaf): Promise<void> => {
    getModelForClass(Leaf).create(leaf);
  }
}

export default FeedSynchronizer;
