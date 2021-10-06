import Feeds from '@umb-network/toolbox/dist/types/Feed';
import {injectable} from 'inversify';

import Leaf from '../types/Leaf';
import LeafBuilder from './LeafBuilder';

@injectable()
class OptionsPriceLeavesBuilder extends LeafBuilder {
  public build(optionPrices: {[key: string]: number} = {}, feeds: Feeds): Leaf[] {
    return Object.entries(optionPrices).map(([option, price]) =>
      this.calculateMean([price], option, this.getOptionFeedPrecision(option, feeds)),
    );
  }

  private getOptionFeedPrecision(option: string, feeds: Feeds): number {
    const [feedNamePrefix] = /^OP:\w{3}/.exec(option) as string[];

    const feed = Object.keys(feeds).find((name) => name.startsWith(feedNamePrefix)) as string;

    return feeds[feed].precision;
  }
}

export default OptionsPriceLeavesBuilder;
