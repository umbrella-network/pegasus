import 'reflect-metadata';
import sinon from 'sinon';
import {expect} from 'chai';
import {Container} from 'inversify';
import {PriceDataOverflowChecker} from '../../../src/services/deviationsFeeds/PriceDataOverflowChecker';
import {mockedLogger} from '../../mocks/logger';
import {PriceData} from '../../../src/types/DeviationFeeds';

describe('PriceDataOverflowChecker', () => {
  let priceDataOverflowChecker: PriceDataOverflowChecker;

  beforeEach(async () => {
    const container = new Container();
    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind(PriceDataOverflowChecker).toSelf();
    priceDataOverflowChecker = container.get(PriceDataOverflowChecker);
  });

  describe('#apply', () => {
    const priceData: PriceData = {
      price: BigInt(1),
      heartbeat: 55,
      timestamp: 1683807742,
      data: 50,
    };

    afterEach(() => {
      sinon.restore();
    });

    it('should return true if none of priceData properties overflow', () => {
      const result = priceDataOverflowChecker.apply(priceData);

      expect(result).to.be.eql(true);
    });

    it('should return false if `data` property overflows', () => {
      const invalidPriceData: PriceData = {
        ...priceData,
        data: 500,
      };

      const loggerSpy = sinon.spy(mockedLogger, 'error');
      const result = priceDataOverflowChecker.apply(invalidPriceData);

      expect(result).to.be.eql(false);

      expect(
        loggerSpy.calledWithExactly(
          sinon.match(`[PriceDataOverflowChecker] data: got ${invalidPriceData.data}, max uint8 ${2 ** 8}`),
        ),
      ).to.be.true;
    });

    it('should return false if `heartbeat` property overflows', () => {
      const invalidPriceData: PriceData = {
        ...priceData,
        heartbeat: 2 ** 24 + 1,
      };

      const loggerSpy = sinon.spy(mockedLogger, 'error');
      const result = priceDataOverflowChecker.apply(invalidPriceData);

      expect(result).to.be.eql(false);

      expect(
        loggerSpy.calledWithExactly(
          sinon.match(`[PriceDataOverflowChecker] heartbeat: got ${invalidPriceData.heartbeat}, max uint24 ${2 ** 24}`),
        ),
      ).to.be.true;
    });

    it('should return false if `timestamp` property overflows', () => {
      const invalidPriceData: PriceData = {
        ...priceData,
        timestamp: 2 ** 32 + 1,
      };

      const loggerSpy = sinon.spy(mockedLogger, 'error');
      const result = priceDataOverflowChecker.apply(invalidPriceData);

      expect(result).to.be.eql(false);

      expect(
        loggerSpy.calledWithExactly(
          sinon.match(`[PriceDataOverflowChecker] timestamp: got ${invalidPriceData.timestamp}, max uint32 ${2 ** 32}`),
        ),
      ).to.be.true;
    });

    it('should return false if `price` property overflows', () => {
      const invalidPriceData: PriceData = {
        ...priceData,
        price: 2n ** 128n + 1n,
      };

      const loggerSpy = sinon.spy(mockedLogger, 'error');
      const result = priceDataOverflowChecker.apply(invalidPriceData);

      expect(result).to.be.eql(false);

      expect(
        loggerSpy.calledWithExactly(
          sinon.match(`[PriceDataOverflowChecker] price: got ${invalidPriceData.price}, max uint128 ${2n ** 128n}`),
        ),
      ).to.be.true;
    });
  });
});
