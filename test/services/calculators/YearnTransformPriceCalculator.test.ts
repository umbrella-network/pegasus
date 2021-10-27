import 'reflect-metadata';
import {Container} from 'inversify';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {YearnTransformPriceCalculator} from '../../../src/services/calculators';
import {BigNumber} from 'ethers';

chai.use(chaiAsPromised);

describe('YearnTransformPriceCalculator', () => {
  let yearnTransformPriceCalculator: YearnTransformPriceCalculator;

  beforeEach(async () => {
    const container = new Container();
    container.bind(YearnTransformPriceCalculator).toSelf();
    yearnTransformPriceCalculator = container.get(YearnTransformPriceCalculator);
  });

  it('returns a key / value pair for the value is a number', async () => {
    const result = yearnTransformPriceCalculator.apply('ABC-*', [{
      tokenAddress: 'tokenAddress',
      tokenSymbol: 'tokenSymbol',
      tokenDecimals: 1,
      tokenVirtualPrice: BigNumber.from(20),
      address: 'address',
      decimals: 1,
      symbol: 'SMB',
      totalAssets: BigNumber.from(30),
      pricePerShare: BigNumber.from(40),
    }], {tsym: 'ETH'}, {'ETH-USD': 100});
    expect(result).to.eql([{
      key: 'ABC-SMB',
      value: 0.08,
    }]);
  });
});
