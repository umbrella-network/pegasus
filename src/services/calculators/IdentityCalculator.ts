import {injectable} from 'inversify';
import {FeedOutput} from '../../types/Feed';

@injectable()
class IdentityCalculator {
  apply(key: string, value: number): FeedOutput[] {
    return [{key, value}];
  }
}

export default IdentityCalculator;
