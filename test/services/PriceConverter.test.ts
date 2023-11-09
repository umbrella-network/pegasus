import 'reflect-metadata';
import chai from 'chai';

import PriceConverter from '../../src/services/PriceConverter.js';

const {expect} = chai;

describe('PriceConverter', () => {
  let priceConverter: PriceConverter;

  beforeEach(async () => {
    priceConverter = new PriceConverter({
      'A1-USD': 100,
      'B1-USD': 100,
      'C1-USD': 100,
      'A2-EUR': 100,
      'B2-EUR': 100,
      'C2-EUR': 100,
      'A3-BTC': 100,
      'B3-BTC': 100,
      'C3-BTC': 100,
      'A4-ETH': 100,
      'B4-ETH': 100,
      'C4-ETH': 100,
      'A5-GBP': 100,
      'B5-GBP': 100,
      'C5-GBP': 100,
    });
  });

  it('converts though USD', async () => {
    expect(priceConverter.apply('A1', 'B1')).to.be.eq(1);
  });

  it('converts though EUR', async () => {
    expect(priceConverter.apply('A2', 'B2')).to.be.eq(1);
  });

  it('converts though BTC', async () => {
    expect(priceConverter.apply('A3', 'B3')).to.be.eq(1);
  });

  it('converts though ETH', async () => {
    expect(priceConverter.apply('A4', 'B4')).to.be.eq(1);
  });

  it('converts though ETH (symmetric)', async () => {
    expect(priceConverter.apply('B4', 'A4')).to.be.eq(1);
  });

  it('cannot convert though GBP', async () => {
    expect(priceConverter.apply('A5', 'B5')).to.be.undefined;
  });
});
