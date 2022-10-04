import {injectable} from 'inversify';

@injectable()
class TimeService {
  apply(offset = 0): number {
    return Math.floor(Date.now() / 1000) - offset;
  }

  static msToSec(timeInMs: number): number {
    return Math.floor(timeInMs / 1000);
  }
}

export default TimeService;
