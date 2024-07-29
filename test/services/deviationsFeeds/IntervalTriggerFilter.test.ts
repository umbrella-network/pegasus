import chai from 'chai';
import sinon from 'sinon';
import {Container} from 'inversify';

import {IntervalTriggerFilter} from '../../../src/services/deviationsFeeds/IntervalTriggerFilter.js';
import {DeviationTriggerLastIntervals} from '../../../src/repositories/DeviationTriggerLastIntervals.js';
import {FetcherName} from '../../../src/types/fetchers.js';
import Feeds from '../../../src/types/Feed.js';

const {expect} = chai;

describe('IntervalTriggerFilter', () => {
  let container: Container;
  let intervalTriggerFilter: IntervalTriggerFilter;
  let mockedDeviationTriggerLastIntervals: sinon.SinonStubbedInstance<DeviationTriggerLastIntervals>;

  beforeEach(async () => {
    container = new Container();
    mockedDeviationTriggerLastIntervals = sinon.createStubInstance(DeviationTriggerLastIntervals);
    container.bind(DeviationTriggerLastIntervals).toConstantValue(mockedDeviationTriggerLastIntervals);
    container.bind(IntervalTriggerFilter).toSelf();
    intervalTriggerFilter = container.get(IntervalTriggerFilter);
  });

  describe('#apply', () => {
    it(
      'should keep the feed, if the difference between the provided timestamp and the feed ' +
        'last interval is greater than the feed interval',
      async () => {
        const dataTimestamp = 1683807742;
        mockedDeviationTriggerLastIntervals.get.resolves({TEST: 1683807732});

        const feeds: Feeds = {
          TEST: {
            discrepancy: 0.1,
            precision: 2,
            interval: 5,
            heartbeat: 10,
            trigger: 5,
            inputs: [
              {
                fetcher: {
                  name: FetcherName.CoingeckoPrice,
                },
              },
              {
                fetcher: {
                  name: FetcherName.SovrynPrice,
                },
              },
            ],
          },
        };

        const expected = {
          TEST: {
            discrepancy: 0.1,
            precision: 2,
            interval: 5,
            heartbeat: 10,
            trigger: 5,
            inputs: [
              {
                fetcher: {
                  name: FetcherName.CoingeckoPrice,
                },
              },
              {
                fetcher: {
                  name: FetcherName.SovrynPrice,
                },
              },
            ],
          },
        };

        const result = await intervalTriggerFilter.apply(dataTimestamp, feeds);

        expect(result).to.deep.include({filteredFeeds: expected});
      },
    );

    it('should keep the feed if it does not have the `interval` property set', async () => {
      const dataTimestamp = 1683807742;
      mockedDeviationTriggerLastIntervals.get.resolves({TEST: 1683807732});

      const feeds: Feeds = {
        TEST: {
          discrepancy: 0.1,
          precision: 2,
          heartbeat: 10,
          trigger: 5,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
              },
            },
          ],
        },
      };

      const expected = {
        TEST: {
          discrepancy: 0.1,
          precision: 2,
          interval: 0,
          heartbeat: 10,
          trigger: 5,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
              },
            },
          ],
        },
      };

      const result = await intervalTriggerFilter.apply(dataTimestamp, feeds);
      expect(result).to.deep.include({filteredFeeds: expected});
    });

    it('should keep the feed if no last interval data is found for the feed', async () => {
      const dataTimestamp = 1683807742;
      mockedDeviationTriggerLastIntervals.get.resolves({});

      const feeds: Feeds = {
        TEST: {
          discrepancy: 0.1,
          precision: 2,
          interval: 5,
          heartbeat: 10,
          trigger: 5,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
              },
            },
          ],
        },
      };

      const expected = {
        TEST: {
          discrepancy: 0.1,
          precision: 2,
          interval: 5,
          heartbeat: 10,
          trigger: 5,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
              },
            },
          ],
        },
      };

      const result = await intervalTriggerFilter.apply(dataTimestamp, feeds);
      expect(result).to.deep.include({filteredFeeds: expected});
    });

    it(
      'should remove the feed, if the difference between the provided timestamp and the feed ' +
        'last interval is greater than the feed interval',
      async () => {
        const dataTimestamp = 1683807742;
        mockedDeviationTriggerLastIntervals.get.resolves({TEST: 1683807741});

        const feeds: Feeds = {
          TEST: {
            discrepancy: 0.1,
            precision: 2,
            interval: 5,
            heartbeat: 10,
            trigger: 5,
            inputs: [
              {
                fetcher: {
                  name: FetcherName.CoingeckoPrice,
                },
              },
              {
                fetcher: {
                  name: FetcherName.SovrynPrice,
                },
              },
            ],
          },
        };

        const expected = {
          TEST: {
            discrepancy: 0.1,
            precision: 2,
            interval: 5,
            heartbeat: 10,
            trigger: 5,
            inputs: [
              {
                fetcher: {
                  name: FetcherName.CoingeckoPrice,
                },
              },
              {
                fetcher: {
                  name: FetcherName.SovrynPrice,
                },
              },
            ],
          },
        };

        const result = await intervalTriggerFilter.apply(dataTimestamp, feeds);
        expect(result).not.to.deep.include({filteredFeeds: expected});
      },
    );
  });
});
