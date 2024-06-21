import {injectable, inject} from 'inversify';
import {Logger} from 'winston';

@injectable()
class FeedChecker {
  @inject('Logger') private logger!: Logger;

  getBaseAndQuote(feedSymbol: string | undefined): string[] {
    if (feedSymbol) {
      const symbolSplitted = feedSymbol.split('-');
      if (symbolSplitted.length == 2) {
        return symbolSplitted;
      }
    }
    this.logger.error(`feed symbol ${feedSymbol} has wrong format`);
    return [];
  }
}

export default FeedChecker;
