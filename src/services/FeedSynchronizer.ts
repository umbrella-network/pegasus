import { getModelForClass } from '@typegoose/typegoose';
import axios from 'axios';
import { injectable } from 'inversify';
import Leaf from '../models/Leaf';
import Feed from '../models/Feed';
import { uuid } from 'uuidv4';

@injectable()
class FeedSynchronizer {
  async apply(feed: Feed): Promise<Leaf[]> {
    const response = await axios.get(feed.sourceUrl);

    return [];
  }

  private createLeaf = async (feed: Feed): Promise<void> => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.feedId = feed._id;
    leaf.type = 'price';
    // leaf.label = tuple[0] as string;
    // leaf.value = tuple[1] as number;
    await getModelForClass(Leaf).create(leaf);
  }
}

export default FeedSynchronizer;
