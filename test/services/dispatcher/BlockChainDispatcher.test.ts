/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import fs from 'fs';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import {BigNumber, ethers, Wallet} from 'ethers';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';
import {GasEstimator} from '@umb-network/toolbox';
import {parseEther} from 'ethers/lib/utils';
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';

import {mockedLogger} from '../../mocks/logger';
import Blockchain from '../../../src/lib/Blockchain';
import Settings from '../../../src/types/Settings';
import Block from '../../../src/models/Block';
import {loadTestEnv} from '../../helpers/loadTestEnv';
import {getTestContainer} from '../../helpers/getTestContainer';
import {ConsensusDataRepository} from '../../../src/repositories/ConsensusDataRepository';
import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository';
import {ChainContractRepository} from '../../../src/repositories/ChainContractRepository';
import {BSCBlockDispatcher} from '../../../src/services/dispatcher/BSCBlockDispatcher';
import ChainContract from '../../../src/contracts/ChainContract';
import ConsensusData from '../../../src/models/ConsensusData';
import {consensusDataFactory} from '../../mocks/factories/consensusDataFactory';
import {chainStatusFactory} from '../../mocks/factories/chainStatusFactory';
import * as mining from '../../../src/utils/mining';
import {transactionResponseFactory} from '../../mocks/factories/transactionResponseFactory';
import {transactionReceiptFactory} from '../../mocks/factories/transactionReceiptFactory';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {SubmitTxMonitor} from '../../../src/services/SubmitTxMonitor';

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('BlockChainDispatcher', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedChainContractRepository: sinon.SinonStubbedInstance<ChainContractRepository>;
  let mockedBlockchainRepository: sinon.SinonStubbedInstance<BlockchainRepository>;
  let consensusDataRepository: ConsensusDataRepository;
  let settings: Settings;
  let bscBlockDispatcher: BSCBlockDispatcher;
  let wallet: Wallet;
  let mockedChainReadyForNewBlock: sinon.SinonStub;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    consensusDataRepository = new ConsensusDataRepository();
  });

  beforeEach(async () => {
    try {
      fs.unlinkSync(new SubmitTxMonitor().monitorFile(ChainsIds.BSC));
    } catch (e) {
      // ok
    }

    await getModelForClass(Block).deleteMany({});
    await getModelForClass(ConsensusData).deleteMany({});
    await consensusDataRepository.save({...consensusDataFactory.build(), timePadding: 1});

    const container = getTestContainer();
    const mockedEthersInterface = sinon.stub(ethers.utils.Interface.prototype);
    mockedChainReadyForNewBlock = sinon.stub(mining, 'chainReadyForNewBlock');
    mockedChainReadyForNewBlock.returns([true, undefined]);

    GasEstimator.apply = () =>
      Promise.resolve({
        isTxType2: true,
        min: 10,
        baseFeePerGas: 10,
        max: 10,
        avg: 10,
        gasPrice: 10,
      });

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      dataTimestampOffsetSeconds: 0,
      consensus: {
        retries: 2,
      },
      version: '1.0.0',
      blockchain: {
        masterChain: {
          chainId: ChainsIds.BSC,
        },
        multiChains: {
          bsc: {
            transactions: {
              waitForBlockTime: 1000,
              minGasPrice: 5000000000,
              maxGasPrice: 10000000000,
              mintBalance: {
                warningLimit: '0.15',
                errorLimit: '0.015',
              },
            },
          },
        },
        transactions: {
          waitForBlockTime: 1000,
          mintBalance: {
            warningLimit: '0.15',
            errorLimit: '0.015',
          },
        },
      },
    } as Settings;

    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContractRepository = sinon.createStubInstance(ChainContractRepository);
    mockedBlockchainRepository = sinon.createStubInstance(BlockchainRepository);

    wallet = Wallet.createRandom();
    mockedBlockchain.chainSettings = settings.blockchain.multiChains.bsc!;
    mockedBlockchain.wallet = wallet;
    mockedBlockchain.wallet.getBalance = async () => parseEther('10');
    mockedBlockchain.getBlockNumber.onCall(0).resolves(10);
    mockedBlockchain.getBlockNumber.onCall(1).resolves(11);

    mockedEthersInterface.parseLog.returns({
      name: 'LogMint',
      args: {minter: 'minter', staked: 'staked', blockId: BigNumber.from(1), power: 10},
    } as any);

    mockedChainContract.resolveStatus.resolves([
      '0x123',
      chainStatusFactory.build({
        nextLeader: wallet.address,
        validators: [wallet.address],
        lastDataTimestamp: mining.timestamp() - 100,
      }),
    ]);

    mockedChainContract.submit.resolves(
      transactionResponseFactory.build({
        wait: sinon.stub().resolves(transactionReceiptFactory.build()),
      }),
    );

    mockedChainContractRepository.get.returns(mockedChainContract);
    mockedBlockchainRepository.get.returns(mockedBlockchain);

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(BlockchainRepository).toConstantValue(mockedBlockchainRepository);
    container.bind(ChainContractRepository).toConstantValue(mockedChainContractRepository);

    container.bind(BSCBlockDispatcher).to(BSCBlockDispatcher);
    bscBlockDispatcher = container.get(BSCBlockDispatcher);
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#apply', () => {
    describe('when balance is lower than mintBalance.errorLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => parseEther('0');
      });

      it('throws an error, do not execute transaction and do not save on mongo', async () => {
        await expect(bscBlockDispatcher.apply()).to.be.rejectedWith(
          `[bsc] Balance (${wallet.address.slice(0, 10)}) is lower than 0.015`,
        );

        const executeTxSpy = sinon.spy(bscBlockDispatcher, <any>'executeTx');
        expect(executeTxSpy.notCalled).to.be.true;
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(0);
      });
    });

    describe('when balance is lower than mintBalance.warnLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => parseEther('0.1');
      });

      it('logs a warning message', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'warn');
        await bscBlockDispatcher.apply();
        expect(loggerSpy).to.have.been.calledWith(`[bsc] Balance (${wallet.address.slice(0, 10)}) is lower than 0.15`);
      });

      it('does save block to database', async () => {
        await bscBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(1);
      });

      it('does execute transaction', async () => {
        const executeTxSpy = sinon.spy(bscBlockDispatcher, <any>'executeTx');
        await bscBlockDispatcher.apply();
        expect(executeTxSpy.called).to.be.true;
      });
    });

    describe('when balance is higher than mintBalance.warnLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => parseEther('1');
      });

      it('does save block to database', async () => {
        await bscBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(1);
      });

      it('does execute transaction', async () => {
        const executeTxSpy = sinon.spy(bscBlockDispatcher, <any>'executeTx');
        await bscBlockDispatcher.apply();
        expect(executeTxSpy.called).to.be.true;
      });
    });

    describe('when consensus is empty', () => {
      beforeEach(async () => {
        await getModelForClass(ConsensusData).deleteMany({});
      });

      it('does log a info message', async () => {
        await bscBlockDispatcher.apply();
        const loggerSpy = sinon.spy(mockedLogger, 'info');
        await bscBlockDispatcher.apply();
        expect(loggerSpy).to.have.been.calledWith('[bsc] no consensus data found to dispatch');
      });

      it('does not save block to database', async () => {
        await bscBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(0);
      });

      it('does not execute transaction', async () => {
        const executeTxSpy = sinon.spy(bscBlockDispatcher, <any>'executeTx');
        await bscBlockDispatcher.apply();
        expect(executeTxSpy.notCalled).to.be.true;
      });
    });

    describe('when chain is not ready', () => {
      const error = 'something went wrong';

      beforeEach(async () => {
        mockedChainReadyForNewBlock.returns([false, error]);
      });

      it('does log a info message', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'info');
        await bscBlockDispatcher.apply();
        expect(loggerSpy).to.have.been.calledWith(
          `[canMint] Error while checking if chainId bsc is available to mint ${error}`,
        );
      });

      it('does not save block to database', async () => {
        await bscBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(0);
      });

      it('does not execute transaction', async () => {
        const executeTxSpy = sinon.spy(bscBlockDispatcher, <any>'executeTx');
        await bscBlockDispatcher.apply();
        expect(executeTxSpy.notCalled).to.be.true;
      });
    });

    describe('when it fails to submit transaction', () => {
      describe('when the error is nonce has already been used', () => {
        beforeEach(() => {
          mockedChainContract.submit.rejects({
            message: 'nonce has already been used',
          });
          mockedBlockchain.wallet.getTransactionCount = async () => 1;
        });

        it('retries submitTx with different nonce', async () => {
          const submitTxSpy = sinon.spy(bscBlockDispatcher, <any>'submitTx');
          const loggerSpy = sinon.spy(mockedLogger, 'warn');
          await bscBlockDispatcher.apply();

          expect(submitTxSpy.calledTwice).to.be.true;
          expect(loggerSpy).to.have.been.calledWith('[bsc] Submit tx with nonce 1 failed. Retrying with 2');
        });
      });

      describe('when transaction timeout', () => {
        beforeEach(() => {
          mockedChainContract.submit.resolves(
            transactionResponseFactory.build({
              wait: async () =>
                new Promise((resolve) =>
                  setTimeout(async () => {
                    resolve(undefined);
                  }, 1),
                ) as any,
            }),
          );
        });

        it('does not retries submitTx with different nonce', async () => {
          const loggerSpy = sinon.spy(mockedLogger, 'warn');
          await bscBlockDispatcher.apply();
          expect(loggerSpy).to.have.been.calledWith('[bsc] canceling tx 0x1234');
        });

        it('does not save block to database', async () => {
          await bscBlockDispatcher.apply();
          const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
          expect(blocksCount).to.be.eq(0);
        });

        it('does call execute cancelPendingTransaction', async () => {
          const executeTxSpy = sinon.spy(bscBlockDispatcher, <any>'cancelPendingTransaction');
          await bscBlockDispatcher.apply();
          expect(executeTxSpy).to.have.been.called;
        });
      });
    });
  });
});
