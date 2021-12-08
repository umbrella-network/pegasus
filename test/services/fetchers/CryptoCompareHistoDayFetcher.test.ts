/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { Container } from 'inversify';
import Settings from '../../../src/types/Settings';
import { expect } from 'chai';
import CryptoCompareHistoDayFetcher from '../../../src/services/fetchers/CryptoCompareHistoDayFetcher';
import moxios from 'moxios';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('CryptoCompareHistoDayFetcher', () => {
  let settings: Settings;

  let cryptoCompareHistoDayFetcher: CryptoCompareHistoDayFetcher;

  beforeEach(async () => {
    moxios.install();

    const container = new Container();

    settings = {
      api: {
        cryptocompare: {
          apiKey: 'CRYPTOCOMPARE_API_KEY',
          timeout: 5000,
        },
      },
    } as Settings;

    container.bind('Settings').toConstantValue(settings);

    container.bind(CryptoCompareHistoDayFetcher).toSelf();

    cryptoCompareHistoDayFetcher = container.get(CryptoCompareHistoDayFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it('sends valid request and correctly transforms response from cryptocompare', async () => {
    const responseExample = {
      Response: 'Success',
      Message: '',
      HasWarning: false,
      Type: 100,
      RateLimit: {},
      Data: {
        Aggregated: false,
        TimeFrom: 1609459200,
        TimeTo: 1612051200,
        Data: [
          {
            time: 1609459200,
            high: 749.71,
            low: 717.14,
            open: 737.15,
            volumefrom: 436164.48,
            volumeto: 320856381.75,
            close: 730.6,
            conversionType: 'direct',
            conversionSymbol: '',
          },
          {
            time: 1609545600,
            high: 788.27,
            low: 716.71,
            open: 730.6,
            volumefrom: 904953.39,
            volumeto: 688632713.33,
            close: 774.9,
            conversionType: 'direct',
            conversionSymbol: '',
          },
        ],
      },
    };

    moxios.stubRequest(/https:\/\/min-api.cryptocompare.com\/data\/v2\/histoday.*/, {
      status: 200,
      response: responseExample,
    });

    const result = await cryptoCompareHistoDayFetcher.apply({
      fsym: 'ETH',
      tsym: 'USD',
      limit: 30,
    });

    expect(moxios.requests.mostRecent().config.headers?.Authorization).to.be.eq('Apikey CRYPTOCOMPARE_API_KEY');

    expect(result).to.be.an('array').with.lengthOf(2);
    expect(result).to.be.deep.eq([
      [
        {
          high: 749.71,
          low: 717.14,
          open: 737.15,
          close: 730.6,
        },
        436164.48,
      ],
      [
        {
          high: 788.27,
          low: 716.71,
          open: 730.6,
          close: 774.9,
        },
        904953.39,
      ],
    ]);
  });
});
