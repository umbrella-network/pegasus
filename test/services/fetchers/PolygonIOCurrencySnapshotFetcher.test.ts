import 'reflect-metadata';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import Settings from '../../../src/types/Settings.js';
import PolygonIOCurrencySnapshotFetcher from '../../../src/services/fetchers/PolygonIOCurrencySnapshotFetcher.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

chai.use(chaiAsPromised);

const {expect} = chai;

describe.skip('PolygonIOCurrencySnapshotFetcher', () => {
  let settings: Settings;
  let polygonIOCurrencySnapshotFetcher: PolygonIOCurrencySnapshotFetcher;

  beforeEach(async () => {
    const container = getTestContainer();

    settings = {
      api: {
        polygonIO: {
          apiKey: process.env.POLYGON_IO_API_KEY,
          timeout: 5000,
          maxBatchSize: 1,
        },
      },
    } as Settings;

    container.rebind('Settings').toConstantValue(settings);

    container.bind(PolygonIOCurrencySnapshotFetcher).toSelf();

    polygonIOCurrencySnapshotFetcher = container.get(PolygonIOCurrencySnapshotFetcher);
  });

  describe('#apply', () => {
    it('responds with a number', async () => {
      if (!process.env.POLYGON_IO_API_KEY) {
        throw new Error('POLYGON_IO_API_KEY not set, test can run only with this key');
      }

      const result = await polygonIOCurrencySnapshotFetcher.apply({ticker: 'C:EURUSD'});
      console.log('PolygonIOCurrencySnapshotFetcher', result);
      expect(typeof result).to.eql('number');
      expect(result).gt(0);
    });
  });
});
