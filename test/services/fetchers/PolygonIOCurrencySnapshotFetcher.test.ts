import 'reflect-metadata';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import Settings from '../../../src/types/Settings.js';
import PolygonIOCurrencySnapshotFetcher from '../../../src/services/fetchers/PolygonIOCurrencySnapshotFetcher.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

chai.use(chaiAsPromised);

const {expect} = chai;

describe('PolygonIOCurrencySnapshotFetcher', () => {
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
    it.only('responds with a number', async () => {
      if (!process.env.POLYGON_IO_API_KEY) {
        console.error('PolygonIOCurrencySnapshotFetcher: POLYGON_IO_API_KEY not set, test can run only with this key');
        return;
      }

      const result = await polygonIOCurrencySnapshotFetcher.apply('X:BTCUSD');
      console.log('PolygonIOCurrencySnapshotFetcher', result);
      expect(result).to.gt(0);
    });
  });
});
