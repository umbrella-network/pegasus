import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import OnChainDataFetcher, {InputParams} from '../../../src/services/fetchers/OnChainDataFetcher.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import settings from '../../../src/config/settings.js';

const {expect} = chai;

describe('OnChainDataFetcher', () => {
  let fetcher: OnChainDataFetcher;

  before(async () => {
    fetcher = Application.get(OnChainDataFetcher);

    settings.blockchains = {
      ethereum: {
        providerUrl: [`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`],
      },
    };

    const container = getTestContainer();
    container.rebind('Settings').toConstantValue(settings);
  });

  describe('#apply', () => {
    it('returns default value', async () => {
      const params: InputParams = {
        address: '0x01e7F40AdB183fa09849243a237A920C5ce509d4',
        method: 'padding',
        inputs: [],
        outputs: ['uint256'],
        args: [],
      };

      const output = await fetcher.apply(params);

      expect(output).eq('65535');
    }).timeout(10000);

    it('return specific value from struct', async () => {
      const params: InputParams = {
        address: '0x01e7F40AdB183fa09849243a237A920C5ce509d4',
        method: 'getStatus',
        inputs: [],
        outputs: ' uint256,uint16,uint32,uint32,uint32'.split(','),
        args: [],
        returnIndex: 1,
      };

      const output = await fetcher.apply(params);
      expect(output).eq('65535', 'invalid read of padding');
    });
  });
});
