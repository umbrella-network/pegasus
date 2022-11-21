import 'reflect-metadata';
import chai, {expect} from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';

import {mockedLogger} from '../mocks/logger';
import {getTestContainer} from '../helpers/getTestContainer';
import {AgentCoordinator} from '../../src/agents/AgentCoordinator';
import {UniswapPoolScannerAgent} from '../../src/agents/UniswapPoolScannerAgent';
import {UniswapVerificationAgent} from '../../src/agents/UniswapVerificationAgent';
import {UniswapPriceScannerAgent} from '../../src/agents/UniswapPriceScannerAgent';

chai.use(chaiAsPromised);

describe('AgentCoordinator', () => {
  let agentCoordinator: AgentCoordinator;
  let mockedUniswapPoolScannerAgent: sinon.SinonStubbedInstance<UniswapPoolScannerAgent>;
  let mockedUniswapPriceScannerAgent: sinon.SinonStubbedInstance<UniswapPriceScannerAgent>;
  let mockedUniswapVerificationAgent: sinon.SinonStubbedInstance<UniswapVerificationAgent>;

  beforeEach(async () => {
    const container = getTestContainer();

    mockedUniswapPoolScannerAgent = sinon.createStubInstance(UniswapPoolScannerAgent);
    mockedUniswapPriceScannerAgent = sinon.createStubInstance(UniswapPriceScannerAgent);
    mockedUniswapVerificationAgent = sinon.createStubInstance(UniswapVerificationAgent);

    container.bind(UniswapPoolScannerAgent).toConstantValue(mockedUniswapPoolScannerAgent);
    container.bind(UniswapPriceScannerAgent).toConstantValue(mockedUniswapPriceScannerAgent);
    container.bind(UniswapVerificationAgent).toConstantValue(mockedUniswapVerificationAgent);
    container.rebind('Logger').toConstantValue(mockedLogger);

    agentCoordinator = container.get(AgentCoordinator);
  });

  afterEach(async () => {
    sinon.restore();
  });

  describe('#start', () => {
    describe('when an agentId is given', () => {
      it('calls only the agent given', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'info');
        await agentCoordinator.start('UniswapPoolScannerAgent');

        expect(loggerSpy.called).to.be.true;
        expect(mockedUniswapPoolScannerAgent.start.called).to.be.true;
      });
    });

    describe('when no agentId is given', () => {
      it('calls all agents', async () => {
        const mockedAgents = [
          mockedUniswapPoolScannerAgent,
          mockedUniswapPriceScannerAgent,
          mockedUniswapVerificationAgent,
        ];
        const loggerSpy = sinon.spy(mockedLogger, 'info');

        await agentCoordinator.start();

        expect(loggerSpy.called).to.be.true;
        mockedAgents.forEach((agent) => {
          expect(agent.start.called).to.be.true;
        });
      });
    });
  });
});
