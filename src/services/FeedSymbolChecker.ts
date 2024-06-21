import {injectable, inject} from 'inversify';
import {Logger} from 'winston';

@injectable()
class FeedSymbolChecker {
  @inject('Logger') private logger!: Logger;

  apply(feedSymbol: string | undefined): string[] {
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

export default FeedSymbolChecker;
