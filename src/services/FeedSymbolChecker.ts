import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

@injectable()
class FeedSymbolChecker {
  @inject('Logger') private logger!: Logger;

  apply(feedSymbol: string | undefined): [base: string, quote: string] | undefined {
    if (feedSymbol) {
      let symbolSplitted = feedSymbol.split('-');

      if (symbolSplitted.length == 2) {
        return [symbolSplitted[0], symbolSplitted[1]];
      } else {
        symbolSplitted = this.backwardsCompatible(feedSymbol);
      }

      if (symbolSplitted.length == 2) {
        return [symbolSplitted[0], symbolSplitted[1]];
      }
    }

    this.logger.error(`feed symbol ${feedSymbol} has wrong format`);
    return undefined;
  }

  private backwardsCompatible(symbol: string): string[] {
    // TODO backwards compatibility code, it can be removed in future if feed config will be updated
    if (symbol == 'FIXED_RAND') {
      this.logger.warn(`Apply hardcoded base & quote for symbol:${symbol}`);
      return ['RAND', 'FIXED'];
    } else if (symbol == 'PolygonGas-TWAP10-wei') {
      this.logger.warn(`Apply hardcoded base & quote for symbol:${symbol}`);
      return ['PolygonGas_TWAP10', 'wei'];
    } else {
      this.logger.error(`Cannot parse base & quote from symbol:${symbol}`);
      return [];
    }
  }
}

export default FeedSymbolChecker;
