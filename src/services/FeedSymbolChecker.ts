import {injectable, inject} from 'inversify';
import {Logger} from 'winston';

@injectable()
class FeedSymbolChecker {
  @inject('Logger') private logger!: Logger;

  apply(feedSymbol: string | undefined): [base: string, quote: string] | undefined {
    if (feedSymbol) {
      const symbolSplitted = feedSymbol.split('-');
      if (symbolSplitted.length == 2) {
        return [symbolSplitted[0], symbolSplitted[1]];
      }
    }

    this.logger.error(`feed symbol ${feedSymbol} has wrong format`);
    return undefined;
  }
}

export default FeedSymbolChecker;
