import { getModelForClass } from '@typegoose/typegoose';
import axios from 'axios';
import { injectable } from 'inversify';
import Datum from '../models/Datum';
import Feed from '../models/Feed';

@injectable()
class FeedSynchronizer {
  async apply(feed: Feed): Promise<void> {
    const response = await axios.get(feed.sourceUrl);

    Object.entries(response.data).forEach(async (tuple) => {
      await this.createDatum(tuple, feed);
    });
  }

  private createDatum = async (tuple: [unknown, unknown], feed: Feed): Promise<void> => {
    const datum = new Datum();
    datum.timestamp = new Date();
    datum.feedId = feed._id;
    datum.type = 'price';
    datum.label = tuple[0] as string;
    datum.value = tuple[1] as number;
    await getModelForClass(Datum).create(datum);
  }
}

export default FeedSynchronizer;
