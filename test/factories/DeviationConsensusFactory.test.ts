import chai from 'chai';
import sinon, {SinonFakeTimers} from 'sinon';
import {DeviationConsensusFactory} from '../../src/factories/DeviationConsensusFactory.js';
import {DeviationDataToSign} from '../../src/types/DeviationFeeds.js';
import {DataCollection} from '../../src/types/custom.js';

const {expect} = chai;

describe('DeviationConsensusFactory', () => {
  let clock: SinonFakeTimers;

  describe('#create', () => {
    beforeEach(() => {
      clock = sinon.useFakeTimers(new Date('2023-05-11').getTime());
    });

    afterEach(() => {
      clock.restore();
    });

    it('should format the deviation data according to chains', () => {
      const dataForConsensus: DeviationDataToSign = {
        dataTimestamp: 1683807742,
        proposedPriceData: {
          TEST: {
            price: BigInt(1),
            heartbeat: 55,
            timestamp: 1683807742,
            data: 50,
          },
        },
        feedsForChain: {
          BSC: ['TEST'],
          ETH: ['TEST'],
        },
        leaves: {
          TEST: '0x1234',
        },
      };

      const signatures: DataCollection<string[]> = {
        BSC: ['0x1234', '0x5678'],
        ETH: ['0x9010', '0x1112'],
      };

      const expected = [
        {
          chainId: 'BSC',
          dataTimestamp: 1683807742,
          keys: ['TEST'],
          priceData: [
            {
              price: BigInt(1),
              heartbeat: 55,
              timestamp: 1683807742,
              data: 50,
            },
          ],
          signatures: ['0x1234', '0x5678'],
          createdAt: new Date('2023-05-11T00:00:00.000Z'),
        },
        {
          chainId: 'ETH',
          dataTimestamp: 1683807742,
          keys: ['TEST'],
          priceData: [
            {
              price: BigInt(1),
              heartbeat: 55,
              timestamp: 1683807742,
              data: 50,
            },
          ],
          signatures: ['0x9010', '0x1112'],
          createdAt: new Date('2023-05-11T00:00:00.000Z'),
        },
      ];

      const result = DeviationConsensusFactory.create(dataForConsensus, signatures);

      expect(result).to.be.eql(expected);
    });
  });
});
