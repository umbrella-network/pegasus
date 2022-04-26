import 'reflect-metadata';
import {expect} from 'chai';

import {PriceRepository} from '../../src/repositories/PriceRepository';
import {getTestContainer} from '../helpers/getTestContainer';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {getModelForClass, mongoose} from '@typegoose/typegoose';
import {Price} from '../../src/models/Price';

describe('PriceRepository', () => {
  let priceRepository: PriceRepository;

  const source = 'test';

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(() => {
    const container = getTestContainer();

    container.bind(PriceRepository).to(PriceRepository);

    priceRepository = container.get(PriceRepository);
  });

  afterEach(async () => {
    await getModelForClass(Price).deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('saveBatch', () => {
    describe('when duplicated prices are given', () => {
      it('saves only once', async () => {
        const timestamp = new Date();
        const price = {source: 'test1', symbol: 'fsym1-tsym1', value: 200, timestamp};

        const prices = [price, price];

        await priceRepository.saveBatch(prices);

        const priceCount = await getModelForClass(Price).countDocuments({}).exec();

        expect(priceCount).to.be.eq(1);
      });
    });

    describe('when diferent prices are given', () => {
      it('calls aggregator with proper data format', async () => {
        const timestamp = new Date();
        const price1 = {source: 'test1', symbol: 'fsym1-tsym1', value: 200, timestamp};
        const price2 = {source: 'test2', symbol: 'fsym2-tsym2', value: 300, timestamp};

        const prices = [price1, price2];

        await priceRepository.saveBatch(prices);

        const priceCount = await getModelForClass(Price).countDocuments({}).exec();

        expect(priceCount).to.be.eq(2);
      });
    });
  });

  describe('getLatestPrice', () => {
    it('resolves price from latest symbol', async () => {
      const symbol = 'fsym1-tsym1';
      const value = 10000;
      const timestamp = new Date();

      await priceRepository.saveBatch([{source, symbol, value, timestamp}]);

      const latestPrice = await priceRepository.getLatestPrice({source, symbol, timestamp: {from: timestamp}});
      expect(latestPrice).to.eq(value);
    });
  });
});
