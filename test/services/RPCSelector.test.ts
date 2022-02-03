import 'reflect-metadata';
import RPCSelector from '../../src/services/RPCSelector';
import Settings from '../../src/types/Settings';

import {mockedLogger} from '../mocks/logger';
import {getTestContainer} from '../helpers/getTestContainer';
import {expect} from 'chai';

describe('RPCSelector', () => {
  let rpcSelector: RPCSelector;
  let settings: Settings;

  beforeEach(() => {
    const container = getTestContainer();

    settings = {
      blockchain: {
        provider: {
          urls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
        },
      },
    } as Settings;

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(RPCSelector).to(RPCSelector);

    rpcSelector = container.get(RPCSelector);
  });

  describe('#apply', () => {
    describe('when BLOCKCHAIN_PROVIDER_URL contains one URL', () => {
      it('uses the provided URL', async () => {
        const url = await rpcSelector.apply();
        const expectedUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
        expect(url).to.be.eq(expectedUrl);
      });
    });

    describe('when BLOCKCHAIN_PROVIDER_URL contains many URLs', () => {
      describe('when the first URL is up to date', () => {
        before(() => {
          const container = getTestContainer();

          settings = {
            blockchain: {
              provider: {
                urls: [
                  'https://data-seed-prebsc-1-s1.binance.org:8545/',
                  'https://data-seed-prebsc-1-s3.binance.org:8545/',
                ],
              },
            },
          } as Settings;

          container.rebind('Logger').toConstantValue(mockedLogger);
          container.rebind('Settings').toConstantValue(settings);
          container.bind(RPCSelector).to(RPCSelector);

          rpcSelector = container.get(RPCSelector);
        });

        it('uses the first provider URL', async () => {
          const url = await rpcSelector.apply();
          const expectedUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
          expect(url).to.be.eq(expectedUrl);
        });
      });

      describe('when the first URL is not up to date', () => {
        before(() => {
          const container = getTestContainer();

          settings = {
            blockchain: {
              provider: {
                urls: [
                  'https://data-seed-prebsc-1-s3.binance.org:8545/',
                  'https://data-seed-prebsc-1-s1.binance.org:8545/',
                ],
              },
            },
          } as Settings;

          container.rebind('Logger').toConstantValue(mockedLogger);
          container.rebind('Settings').toConstantValue(settings);
          container.bind(RPCSelector).to(RPCSelector);

          rpcSelector = container.get(RPCSelector);
        });

        it('returns the RPC with highest block number', async () => {
          const url = await rpcSelector.apply();
          const expectedUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
          expect(url).to.be.eq(expectedUrl);
        });
      });
    });
  });
});
