import 'reflect-metadata';
import chai from 'chai';
import {Container} from 'inversify';

import {PriceMetadataComparator} from '../../../src/services/deviationsFeeds/PriceMetadataComparator.js';
import {DeviationDataToSign, DeviationFeeds} from '../../../src/types/DeviationFeeds.js';
import {FetcherName} from '../../../src/types/fetchers.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import Leaf from '../../../src/types/Leaf.js';

const {expect} = chai;

describe('PriceMetadataComparator', () => {
  let priceMetadataComparator: PriceMetadataComparator;

  beforeEach(async () => {
    const container = new Container();
    container.bind(PriceMetadataComparator).toSelf();
    priceMetadataComparator = container.get(PriceMetadataComparator);
  });

  describe('#apply', () => {
    it('should return true if priceData and localPriceData details match for all keys', () => {
      const dataToSign: DeviationDataToSign = {
        dataTimestamp: 1683807742,
        proposedPriceData: {
          TEST1: {
            price: BigInt(125),
            heartbeat: 55,
            timestamp: 1683807742,
            data: 0,
          },
          TEST2: {
            price: BigInt(2),
            heartbeat: 65,
            timestamp: 1683807742,
            data: 0,
          },
        },
        feedsForChain: {
          BSC: ['TEST', 'TEST2'],
          ETH: ['TEST', 'TEST2'],
        },
        leaves: {
          TEST1: '0x12345678910',
          TEST2: '0x56789101234',
        },
      };

      const localLeaves: Leaf[] = [
        {label: 'TEST1', valueBytes: '0x12345678910'},
        {label: 'TEST2', valueBytes: '0x56789101234'},
      ];

      const localFeeds: DeviationFeeds = {
        TEST1: {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
          discrepancy: 0.1,
          precision: 2,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
                params: {
                  ticker: '',
                },
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
                params: {
                  ticker: '',
                },
              },
            },
          ],
        },
        TEST2: {
          heartbeat: 65,
          trigger: 110,
          interval: 20,
          chains: [ChainsIds.BSC],
          discrepancy: 0.2,
          precision: 4,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
                params: {
                  ticker: '',
                },
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
                params: {
                  ticker: '',
                },
              },
            },
          ],
        },
      };

      const result = priceMetadataComparator.apply(dataToSign, localLeaves, localFeeds);
      expect(result).to.be.true;
    });

    it('should throw an error if priceData and localPriceData details do not match for any key', () => {
      const dataToSign: DeviationDataToSign = {
        dataTimestamp: 1683807742,
        proposedPriceData: {
          TEST1: {
            price: BigInt(1),
            heartbeat: 56,
            timestamp: 1683807743,
            data: 1,
          },
        },
        feedsForChain: {
          BSC: ['TEST1'],
        },
        leaves: {
          TEST1: '0x1234',
        },
      };

      const localLeaves: Leaf[] = [{label: 'TEST1', valueBytes: '0x1234'}];

      const localFeeds: DeviationFeeds = {
        TEST1: {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
          discrepancy: 0.1,
          precision: 2,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
                params: {
                  ticker: '',
                },
              },
            },
          ],
        },
      };

      expect(() => priceMetadataComparator.apply(dataToSign, localLeaves, localFeeds)).to.throw(
        Error,
        /^\[PriceDataComparator] expected TEST1: .* got .*$/,
      );
    });
  });
});
