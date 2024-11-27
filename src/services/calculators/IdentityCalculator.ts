import {injectable} from 'inversify';
import {FeedOutput} from '../../types/Feed.js';
import {CalculatorInterface, CalculatorValueType} from '../../types/CalculatorInterface.js';

interface IdentityCalculatorValueType {
  key: string;
  value: number;
}

export type IdentityCalculatorAnyValueType =
  | IdentityCalculatorValueType
  | IdentityCalculatorValueType[]
  | number
  | null;

@injectable()
class IdentityCalculator implements CalculatorInterface {
  apply(feedKey: string, feedValue: CalculatorValueType): FeedOutput[] {
    if (!feedValue) {
      return [];
    } else if (Array.isArray(feedValue as IdentityCalculatorAnyValueType)) {
      return (feedValue as IdentityCalculatorValueType[]).map(({key, value}) => ({
        key: feedKey.replace('*', key),
        feedPrice: {value},
      }));
    } else if (typeof feedValue === 'object') {
      const {key, value} = feedValue as IdentityCalculatorValueType;
      return [{key: feedKey.replace('*', key), feedPrice: {value}}];
    } else {
      return [{key: feedKey, feedPrice: {value: feedValue}}];
    }
  }
}

export default IdentityCalculator;
