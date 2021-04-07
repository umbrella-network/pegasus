import {injectable} from 'inversify';

@injectable()
class TimeService {
  apply(): number {
    return Math.floor(Date.now() / 1000);
  }
}

export default TimeService;
