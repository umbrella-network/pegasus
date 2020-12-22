import {injectable} from 'inversify';

@injectable()
class IdentityCalculator {
  apply<T>(value: T): T {
    return value;
  }
}

export default IdentityCalculator;
