import {injectable} from 'inversify';

@injectable()
class TimeService {
  apply(offset = 0): number {
    return Math.floor(Date.now() / 1000) - offset;
  }
}

export default TimeService;
