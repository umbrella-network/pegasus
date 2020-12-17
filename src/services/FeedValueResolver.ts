import axios from 'axios';
import {inject, injectable} from 'inversify';
import { JSONPath } from 'jsonpath-plus';
import Feed from '../models/Feed';
import Settings from "../types/Settings";

@injectable()
class FeedValueResolver {
  private apiKey: string;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.cryptocompare.apiKey;
  }

  async apply(feed: Feed): Promise<number | undefined> {
    const response = await axios.get(feed.sourceUrl, {
      headers: {'Authorization': 'token ${this.apiKey}'}
    });
    return this.extractValue(response.data, feed.valuePath);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): number | undefined => {
    const match: number[] | null = JSONPath({json: data, path: valuePath});
    if (match) return match[0];
  }
}

export default FeedValueResolver;
