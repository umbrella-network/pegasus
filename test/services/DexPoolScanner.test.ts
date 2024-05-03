import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

import Settings from '../../src/types/Settings.js';
import {mockedLogger} from '../mocks/logger.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {DexProtocolName} from '../../src/types/DexProtocolName.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import {DexPoolScannerAgent} from '../../src/agents/DexPoolScannerAgent.js';
import {Container} from 'inversify';
import {DexPoolScanner} from '../../src/services/DexPoolScanner.js';
import {BlockchainProviderRepository} from '../../src/repositories/BlockchainProviderRepository.js';
import {MappingRepository} from '../../src/repositories/MappingRepository.js';
import {DexRepository} from '../../src/repositories/DexRepository.js';
import {DexProtocolFactory} from '../../src/factories/DexProtocolFactory.js';
import {UniswapV3Factory} from '../../src/blockchains/evm/contracts/UniswapV3Factory.js';
import Application from '../../src/lib/Application.js';

const {expect} = chai;

describe('DexPoolScanner', () => {
  let settings: Settings;
  let container: Container;
  let dexPoolScanner: DexPoolScanner;
  let mockedApplicationGet: sinon.SinonStubbedInstance<any>;
  let mockedStaticJsonRpcProvider: sinon.SinonStubbedInstance<StaticJsonRpcProvider>;
  let mockedBlockchainProviderRepository: sinon.SinonStubbedInstance<BlockchainProviderRepository>;
  let mockedMappingRepository: sinon.SinonStubbedInstance<MappingRepository>;
  let mockedDexRepository: sinon.SinonStubbedInstance<DexRepository>;
  let mockedUniswapV3Factory: sinon.SinonStubbedInstance<UniswapV3Factory>;

  beforeEach(async () => {
    container = getTestContainer();

    mockedStaticJsonRpcProvider = sinon.createStubInstance(StaticJsonRpcProvider);
    mockedBlockchainProviderRepository = sinon.createStubInstance(BlockchainProviderRepository);
    mockedMappingRepository = sinon.createStubInstance(MappingRepository);
    mockedUniswapV3Factory = sinon.createStubInstance(UniswapV3Factory);
    mockedDexRepository = sinon.createStubInstance(DexRepository);

    mockedUniswapV3Factory.getPoolCreatedEvents.resolves([
      {token0: '0xABCD', token1: '0xABFD', fee: BigInt(400.0), pool: '0xPOLKD', anchor: 123},
    ]);

    mockedMappingRepository.set.resolves();
    mockedStaticJsonRpcProvider.getBlockNumber.resolves(50_000);

    sinon.stub(DexProtocolFactory, 'create').callsFake(() => mockedUniswapV3Factory);
    sinon.createStubInstance(DexPoolScannerAgent);

    mockedBlockchainProviderRepository.get.returns(mockedStaticJsonRpcProvider);

    mockedApplicationGet = sinon.stub(Application, 'get');
    mockedApplicationGet.onCall(0).returns(mockedBlockchainProviderRepository);
    mockedApplicationGet.onCall(1).returns(mockedMappingRepository);
    mockedApplicationGet.onCall(2).returns(mockedDexRepository);
    mockedApplicationGet.onCall(3).returns(settings);
    mockedApplicationGet.onCall(4).returns(mockedLogger);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#constructor', () => {
    describe('when settings are invalid', () => {
      describe('when missing providerURL', () => {
        beforeEach(() => {
          settings = {
            blockchains: {
              ethereum: {
                providerUrl: [],
              },
            },
            dexes: {
              [ChainsIds.ETH]: {
                [DexProtocolName.UNISWAP_V3]: {
                  active: true,
                },
              },
            },
          } as unknown as Settings;

          mockedApplicationGet.onCall(3).returns(settings);
        });

        it('thrown error', async () => {
          expect(() => new DexPoolScanner(ChainsIds.ETH, DexProtocolName.UNISWAP_V3)).to.throw(
            Error,
            '[DexPoolScanner][ethereum][uniswapV3] provider URL not set',
          );
        });
      });

      describe('when startBlock is 0', () => {
        beforeEach(() => {
          settings = {
            blockchains: {
              ethereum: {
                providerUrl: ['test'],
              },
            },
            dexes: {
              [ChainsIds.ETH]: {
                [DexProtocolName.UNISWAP_V3]: {
                  active: true,
                  startBlock: 0,
                },
              },
            },
          } as unknown as Settings;

          mockedApplicationGet.onCall(3).returns(settings);
        });

        it('thrown error', async () => {
          expect(() => new DexPoolScanner(ChainsIds.ETH, DexProtocolName.UNISWAP_V3)).to.throw(
            Error,
            '[DexPoolScanner][ethereum][uniswapV3] startBlock must be higher than 0',
          );
        });
      });
    });
  });

  describe('#run', () => {
    describe('when latestBlock is higher than startBlock + agentStep', () => {
      beforeEach(() => {
        settings = {
          blockchains: {
            ethereum: {
              providerUrl: ['test'],
            },
          },
          dexes: {
            [ChainsIds.ETH]: {
              [DexProtocolName.UNISWAP_V3]: {
                active: true,
                startBlock: 20,
                agentStep: 50,
              },
            },
          },
        } as unknown as Settings;

        mockedApplicationGet.onCall(3).returns(settings);
        mockedMappingRepository.get.resolves('100');

        container.bind(DexPoolScanner).toConstantValue(new DexPoolScanner(ChainsIds.ETH, DexProtocolName.UNISWAP_V3));

        dexPoolScanner = container.get(DexPoolScanner);
      });

      it('response with success and toBlock', async () => {
        const result = await dexPoolScanner.run();
        expect(result).to.be.eqls({success: true, fromBlock: 101, toBlock: 150});
      });
    });

    describe('when latestBlock is lower than startBlock + agentStep', () => {
      beforeEach(() => {
        settings = {
          blockchains: {
            ethereum: {
              providerUrl: ['test'],
            },
          },
          dexes: {
            [ChainsIds.ETH]: {
              [DexProtocolName.UNISWAP_V3]: {
                active: true,
                startBlock: 20,
                agentStep: 500,
              },
            },
          },
        } as unknown as Settings;

        mockedApplicationGet.onCall(3).returns(settings);
        mockedMappingRepository.get.resolves('100');
        mockedStaticJsonRpcProvider.getBlockNumber.resolves(300);

        container.bind(DexPoolScanner).toConstantValue(new DexPoolScanner(ChainsIds.ETH, DexProtocolName.UNISWAP_V3));

        dexPoolScanner = container.get(DexPoolScanner);
      });

      it('response with success false and waitBlockRange true', async () => {
        const result = await dexPoolScanner.run();
        expect(result).to.be.eqls({fromBlock: 101, success: false, waitBlockRange: true});
      });
    });

    describe('when latestBlock is the same than startBlock + agentStep', () => {
      beforeEach(() => {
        settings = {
          blockchains: {
            ethereum: {
              providerUrl: ['test'],
            },
          },
          dexes: {
            [ChainsIds.ETH]: {
              [DexProtocolName.UNISWAP_V3]: {
                active: true,
                startBlock: 20,
                agentStep: 200,
              },
            },
          },
        } as unknown as Settings;

        mockedApplicationGet.onCall(3).returns(settings);
        mockedMappingRepository.get.resolves('100');
        mockedStaticJsonRpcProvider.getBlockNumber.resolves(300);

        container.bind(DexPoolScanner).toConstantValue(new DexPoolScanner(ChainsIds.ETH, DexProtocolName.UNISWAP_V3));

        dexPoolScanner = container.get(DexPoolScanner);
      });

      it('response with success, toBlock and fromBlock', async () => {
        const result = await dexPoolScanner.run();
        expect(result).to.be.eqls({fromBlock: 101, toBlock: 300, success: true});
      });
    });

    describe('when there is no mapping persisted', () => {
      beforeEach(() => {
        settings = {
          blockchains: {
            ethereum: {
              providerUrl: ['test'],
            },
          },
          dexes: {
            [ChainsIds.ETH]: {
              [DexProtocolName.UNISWAP_V3]: {
                active: true,
                startBlock: 20,
                agentStep: 100,
              },
            },
          },
        } as unknown as Settings;

        mockedApplicationGet.onCall(3).returns(settings);
        mockedMappingRepository.get.resolves(undefined);
        mockedStaticJsonRpcProvider.getBlockNumber.resolves(300);

        container.bind(DexPoolScanner).toConstantValue(new DexPoolScanner(ChainsIds.ETH, DexProtocolName.UNISWAP_V3));

        dexPoolScanner = container.get(DexPoolScanner);
      });

      it('response with fromBlock from settings', async () => {
        const result = await dexPoolScanner.run();
        expect(result).to.be.eqls({fromBlock: 20, toBlock: 119, success: true});
      });
    });
  });
});
