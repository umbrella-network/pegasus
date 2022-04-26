import {FeedOutput} from './Feed';

export interface ICalculator {
  // eslint-disable-next-line
  apply: (key: string, value: any, params: any, ...args: any[]) => FeedOutput[];
}
