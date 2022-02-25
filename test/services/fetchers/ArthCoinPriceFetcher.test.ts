import 'reflect-metadata';
import sinon from 'sinon';
import {Container} from 'inversify';
import Settings from '../../../src/types/Settings';
import {expect} from 'chai';
import ArthCoinPriceFetcher from '../../../src/services/fetchers/ArthCoinPriceFetcher';
import moxios from 'moxios';

import {mockedLogger} from '../../mocks/logger';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('ArthCoinPriceFetcher', () => {
  let settings: Settings;

  let arthCoinPriceFetcher: ArthCoinPriceFetcher;

  beforeEach(async () => {
    moxios.install();

    const container = new Container();

    settings = {
      api: {
        arthCoin: {
          timeout: 5000,
        },
      },
    } as Settings;

    container.bind('Settings').toConstantValue(settings);
    container.bind('Logger').toConstantValue(mockedLogger);

    container.bind(ArthCoinPriceFetcher).toSelf();

    arthCoinPriceFetcher = container.get(ArthCoinPriceFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
    sinon.restore();
  });

  describe('#apply', () => {
    describe('when request successed', () => {
      describe('when response object with normalizedIndexPrice', () => {
        it('resolve the param id value', async () => {
          const responseExample = {
            goldsPercentage: 285.6105,
            bitcoinPercentage: 1947.3,
            fiatPercentage: 13.889367503839997,
            startingPrice: 1214.5,
            indexPrice: 2246.79986750384,
            normalizedIndexPrice: 1.84997930630205,
          };

          moxios.stubRequest('https://gmu.arthcoin.com/gmu', {
            status: 200,
            response: responseExample,
          });

          const result = await arthCoinPriceFetcher.apply({id: 'normalizedIndexPrice'});

          expect(result).to.eql(1.84997930630205);
        });
      });

      describe('when response empty object', () => {
        it('resolve with undefined', async () => {
          const responseExample = {};

          moxios.stubRequest('https://gmu.arthcoin.com/gmu', {
            status: 200,
            response: responseExample,
          });

          const result = await arthCoinPriceFetcher.apply({id: 'normalizedIndexPrice'});

          expect(result).to.eql(undefined);
        });
      });
    });

    describe('when request timeout', () => {
      it('calls a .warn on the logger', async () => {
        moxios.stubTimeout('https://gmu.arthcoin.com/gmu');

        const spy = sinon.spy(mockedLogger, 'warn');

        await arthCoinPriceFetcher.apply({id: 'normalizedIndexPrice'});

        expect(spy.calledWithExactly(sinon.match(`Skipping ArthCoinPrice fetcher`))).to.be.true;
      });

      it('resolve with undefined', async () => {
        moxios.stubTimeout('https://gmu.arthcoin.com/gmu');

        const result = await arthCoinPriceFetcher.apply({id: 'normalizedIndexPrice'});

        expect(result).to.eql(undefined);
      });
    });
  });
});
