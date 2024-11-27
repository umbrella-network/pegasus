import {injectable} from 'inversify';
import {BigNumber} from 'ethers';

import {FeedOutput} from '../../types/Feed.js';
import {Vault} from '../fetchers/YearnVaultTokenPriceFetcher.js';
import PriceConverter from '../PriceConverter.js';
import {CalculatorInterface, CalculatorValueType} from '../../types/CalculatorInterface.js';

@injectable()
class YearnTransformPriceCalculator implements CalculatorInterface {
  apply(
    key: string,
    vaults: CalculatorValueType,
    params: {tsym: string},
    prices: {[key: string]: number},
  ): FeedOutput[] {
    const {tsym} = params;

    const result: {[key: string]: FeedOutput} = {};

    for (const vault of vaults as Vault[]) {
      const {tokenSymbol, decimals, pricePerShare, tokenVirtualPrice, tokenDecimals, symbol} = vault;

      const priceConverter = new PriceConverter(
        tokenVirtualPrice.isZero()
          ? prices
          : {
              ...prices,
              [`${tokenSymbol}-USD`]: this.bigNumberToNumber(tokenVirtualPrice, tokenDecimals),
            },
      );

      const tokenPrice = priceConverter.apply(tokenSymbol, tsym);

      if (!tokenPrice) {
        continue;
      }

      const yvPrice = tokenPrice * this.bigNumberToNumber(pricePerShare, decimals);

      // Override with the most recent vault token price if the same key already exists
      const outputKey = key.replace('*', symbol);
      result[outputKey] = {key: outputKey, feedPrice: {value: yvPrice}};
    }

    return Object.values(result);
  }

  private bigNumberToNumber(bigNumber: BigNumber, decimals: number, precision = 8) {
    const expDecimals = Math.max(0, decimals - precision);

    const exp1 = BigNumber.from(10).pow(expDecimals);
    const exp2 = Math.pow(10, decimals - expDecimals);

    return bigNumber.div(exp1).toNumber() / exp2;
  }
}

export default YearnTransformPriceCalculator;
