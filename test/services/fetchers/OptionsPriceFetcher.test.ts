import 'reflect-metadata';
import sinon from 'sinon';
import { Container } from 'inversify';
import Settings from '../../../src/types/Settings';
import { expect } from 'chai';
import OptionsPriceFetcher from '../../../src/services/fetchers/OptionsPriceFetcher'
import moxios from 'moxios';

import {mockedLogger} from '../../mocks/logger';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('OptionsPriceFetcher', () => {
  let settings: Settings;

  let optionsPriceFetcher: OptionsPriceFetcher;

  beforeEach(async () => {
    moxios.install();

    const container = new Container();

    settings = {
      api: {
        optionsPrice: {
          apiKey: 'OPTIONS_PRICE_API_KEY',
          timeout: 5000,
        },
      },
    } as Settings;

    container.bind('Settings').toConstantValue(settings);
    container.bind('Logger').toConstantValue(mockedLogger);

    container.bind(OptionsPriceFetcher).toSelf();

    optionsPriceFetcher = container.get(OptionsPriceFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
    sinon.restore();
  });

  describe('when OPTIONS_PRICE_API_KEY is valid', () => {
    it('returns the formatted options', async () => {
      const responseExample = {
        data: {
          "ETH-17SEP21-3500": {
            callPrice: 0.123,
            putPrice: 0.123,
            iv: 71.123,
          },
        },
      };

      moxios.stubRequest('https://options-api.umb.network/options', {
        status: 200,
        response: responseExample,
      });

      const result = await optionsPriceFetcher.apply();

      expect(result).to.eql({
        'ETH-17SEP21-3500': {
          callPrice: 0.123,
          putPrice: 0.123,
          iv: 71.123,
        },
      });
    });
  });

  describe('when OPTIONS_PRICE_API_KEY is invalid', () => {
    it('calls a .warn on the logger', async () => {
      moxios.stubRequest('https://options-api.umb.network/options', {
        status: 401,
        response: {error: 'Request failed with 401.'},
      });

      const spy = sinon.spy(mockedLogger, 'warn');

      await optionsPriceFetcher.apply();

      expect(spy.calledWithExactly(sinon.match(`Skipping OptionsPrice fetcher`))).to.be.true;
    });

    it('resolves an empty object', async () => {
      moxios.stubRequest('https://options-api.umb.network/options', {
        status: 401,
        response: {error: 'Unrecognized API key.'},
      });

      const result = await optionsPriceFetcher.apply();

      expect(result).to.eql({});
    });
  });
});
