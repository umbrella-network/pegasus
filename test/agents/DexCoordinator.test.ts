import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';

import Settings from '../../src/types/Settings.js';
import {DexCoordinator} from '../../src/agents/DexCoordinator.js';
import {mockedLogger} from '../mocks/logger.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {DexProtocolName} from '../../src/types/DexProtocolName.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import {DexPoolScannerAgentRepository} from '../../src/repositories/DexPoolScannerAgentRepository.js';
import {DexPoolScannerAgent} from '../../src/agents/DexPoolScannerAgent.js';
import {Container} from 'inversify';

const {expect} = chai;

describe('DexCoordinator', () => {
  let settings: Settings;
  let container: Container;
  let dexCoordinator: DexCoordinator;
  let mockedDexPoolScannerAgentRepository: sinon.SinonStubbedInstance<DexPoolScannerAgentRepository>;
  let mockedDexPoolScannerAgent: sinon.SinonStubbedInstance<DexPoolScannerAgent>;

  beforeEach(async () => {
    container = getTestContainer();

    container.rebind('Logger').toConstantValue(mockedLogger);
    mockedDexPoolScannerAgentRepository = sinon.createStubInstance(DexPoolScannerAgentRepository);
    mockedDexPoolScannerAgent = sinon.createStubInstance(DexPoolScannerAgent);
    mockedDexPoolScannerAgentRepository.get.returns(mockedDexPoolScannerAgent);
    container.bind(DexPoolScannerAgentRepository).toConstantValue(mockedDexPoolScannerAgentRepository);
    container.bind(DexCoordinator).toSelf();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('when settings are valid', () => {
    beforeEach(() => {
      settings = {
        dexes: {
          [ChainsIds.ETH]: {
            [DexProtocolName.UNISWAP_V3]: {
              active: true,
            },
          },
        },
      } as Settings;

      container.rebind('Settings').toConstantValue(settings);
      dexCoordinator = container.get(DexCoordinator);
    });

    it('calls dexPoolScannerAgentRepository with chainId and dexProtocol in the settings', async () => {
      await dexCoordinator.start();
      expect(mockedDexPoolScannerAgentRepository.get).to.have.been.calledWith(
        ChainsIds.ETH,
        DexProtocolName.UNISWAP_V3,
      );
      expect(mockedDexPoolScannerAgentRepository.get.calledOnce).to.be.true;
    });
  });

  describe('when settings are invalid', () => {
    beforeEach(() => {
      settings = {
        dexes: {
          [ChainsIds.ETH]: {
            [DexProtocolName.UNISWAP_V3]: {
              active: false,
            },
          },
        },
      } as Settings;

      container.rebind('Settings').toConstantValue(settings);
      dexCoordinator = container.get(DexCoordinator);
    });

    it('does not call dexPoolScannerAgentRepository', async () => {
      await dexCoordinator.start();
      expect(mockedDexPoolScannerAgentRepository.get.called).to.be.false;
    });

    it('calls logger warn', async () => {
      const loggerSpy = sinon.spy(mockedLogger, 'warn');
      await dexCoordinator.start();

      expect(loggerSpy).to.have.calledWith(
        '[DexCoordinator][ethereum][uniswapV3] agent scanner is not valid, skipping.',
      );
    });
  });
});
