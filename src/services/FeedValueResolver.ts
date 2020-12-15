import axios from 'axios';
import { injectable } from 'inversify';
import { JSONPath } from 'jsonpath-plus';
import Feed from '../models/Feed';

@injectable()
class FeedValueResolver {
  static async apply(feed: Feed): Promise<number | undefined> {
    const response = await axios.get(feed.sourceUrl);
    return this.extractValue(response.data, feed.valuePath);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractValue = (data: any, valuePath: string): number | undefined => {
    const match: number[] | null = JSONPath({ json: data, path: valuePath });
    if (match) return match[0];
  }
}

export default FeedValueResolver;
