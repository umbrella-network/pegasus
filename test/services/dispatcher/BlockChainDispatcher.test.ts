/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
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
import ChainContract from '../../../src/blockchains/evm/contracts/ChainContract';
import ConsensusData from '../../../src/models/ConsensusData';
import {consensusDataFactory} from '../../mocks/factories/consensusDataFactory';
import {chainStatusFactory} from '../../mocks/factories/chainStatusFactory';
import * as mining from '../../../src/utils/mining';
import {transactionResponseFactory} from '../../mocks/factories/transactionResponseFactory';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {MappingRepository} from "../../../src/repositories/MappingRepository";
import {SubmitTxKeyResolver} from "../../../src/services/SubmitMonitor/SubmitTxKeyResolver";
import {mockIWallet} from "../../helpers/mockIWallet";
import {AvalancheBlockDispatcher} from "../../../src/services/dispatchers/networks/AvalancheBlockDispatcher";

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('BlockChainDispatcher', () => {
  const wallet = Wallet.createRandom();

  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedChainContractRepository: sinon.SinonStubbedInstance<ChainContractRepository>;
  let mockedBlockchainRepository: sinon.SinonStubbedInstance<BlockchainRepository>;
  let consensusDataRepository: ConsensusDataRepository;
  let mappingRepository: MappingRepository;
  let settings: Settings;
  let avaxBlockDispatcher: AvalancheBlockDispatcher;
  let mockedChainReadyForNewBlock: sinon.SinonStub;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    consensusDataRepository = new ConsensusDataRepository();
    mappingRepository = new MappingRepository();
  });

  beforeEach(async () => {
    await mappingRepository.remove(SubmitTxKeyResolver.apply(ChainsIds.AVALANCHE));

    await getModelForClass(Block).deleteMany({});
    await getModelForClass(ConsensusData).deleteMany({});
    await consensusDataRepository.save({...consensusDataFactory.build()});

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
        wallets: {
          evm: {
            privateKey: wallet.privateKey,
          },
        },
        multiChains: {
          avax: {
            transactions: {
              waitForBlockTime: 1000,
              minGasPrice: 5000000000,
              maxGasPrice: 10000000000,
              minBalance: {
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

    mockedBlockchain.chainSettings = settings.blockchain.multiChains.avax!;
    mockedBlockchain.wallet = mockIWallet(wallet);
    mockedBlockchain.wallet.getBalance = async () => BigInt(parseEther('10'));
    mockedBlockchain.wallet.getNextNonce = async () => 1;
    mockedBlockchain.getBlockNumber.onCall(0).resolves(10n);
    mockedBlockchain.getBlockNumber.onCall(1).resolves(11n);

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

    mockedChainContract.submit.resolves({
      hash: transactionResponseFactory.build().hash,
      atBlock: BigInt(transactionResponseFactory.build().blockNumber)
    });

    mockedChainContractRepository.get.returns(mockedChainContract);
    mockedBlockchainRepository.get.returns(mockedBlockchain);

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(BlockchainRepository).toConstantValue(mockedBlockchainRepository);
    container.bind(ChainContractRepository).toConstantValue(mockedChainContractRepository);
    container.bind(SubmitTxKeyResolver).toConstantValue(SubmitTxKeyResolver);

    container.bind(AvalancheBlockDispatcher).to(AvalancheBlockDispatcher);
    avaxBlockDispatcher = container.get(AvalancheBlockDispatcher);
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    sinon.restore();
    await mappingRepository.remove(SubmitTxKeyResolver.apply(ChainsIds.AVALANCHE));
  });

  describe('#apply', () => {
    describe('when balance is lower than mintBalance.errorLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => 0n;
        mockedBlockchain.wallet.getNextNonce = async () => 1;
      });

      it.skip('throws an error, do not execute transaction and do not save on mongo', async () => {
        await expect(avaxBlockDispatcher.apply()).to.be.rejectedWith(
          `[avax] Balance (${wallet.address.slice(0, 10)}) is lower than 0.015`,
        );

        const executeTxSpy = sinon.spy(avaxBlockDispatcher, <any>'executeTx');
        expect(executeTxSpy.notCalled).to.be.true;
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(0);
      });
    });

    describe('when balance is lower than mintBalance.warnLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => BigInt(parseEther('0.1'));
        mockedBlockchain.wallet.getNextNonce = async () => 1;
      });

      it.skip('logs a warning message', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'warn');
        await avaxBlockDispatcher.apply();
        expect(loggerSpy).to.have.been.calledWith(`[avax][LAYER2] Balance (${wallet.address.slice(0, 10)}) is lower than 0.15`);
      });

      it.skip('does save block to database', async () => {
        await avaxBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(1);
      });

      it.skip('does execute transaction', async () => {
        const executeTxSpy = sinon.spy(avaxBlockDispatcher, <any>'executeTx');
        await avaxBlockDispatcher.apply();
        expect(executeTxSpy.called).to.be.true;
      });
    });

    describe('when balance is higher than mintBalance.warnLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => BigInt(parseEther('1'));
        mockedBlockchain.wallet.getNextNonce = async () => 1;
      });

      it.skip('does save block to database', async () => {
        await avaxBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(1);
      });

      it.skip('does execute transaction', async () => {
        const executeTxSpy = sinon.spy(avaxBlockDispatcher, <any>'executeTx');
        await avaxBlockDispatcher.apply();
        expect(executeTxSpy.called).to.be.true;
      });
    });

    describe('when consensus is empty', () => {
      beforeEach(async () => {
        await getModelForClass(ConsensusData).deleteMany({});
      });

      it.skip('does log a info message', async () => {
        await avaxBlockDispatcher.apply();
        const loggerSpy = sinon.spy(mockedLogger, 'info');
        await avaxBlockDispatcher.apply();
        expect(loggerSpy).to.have.been.calledWith('[avax][LAYER2] no consensus data found to dispatch');
      });

      it.skip('does not save block to database', async () => {
        await avaxBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(0);
      });

      it.skip('does not execute transaction', async () => {
        const executeTxSpy = sinon.spy(avaxBlockDispatcher, <any>'executeTx');
        await avaxBlockDispatcher.apply();
        expect(executeTxSpy.notCalled).to.be.true;
      });
    });

    describe('when chain is not ready', () => {
      const error = 'something went wrong';

      beforeEach(async () => {
        mockedChainReadyForNewBlock.returns([false, error]);
      });

      it.skip('does log a info message', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'info');
        await avaxBlockDispatcher.apply();
        expect(loggerSpy).to.have.been.calledWith(`[avax] Can not mint: ${error}`);
      });

      it.skip('does not save block to database', async () => {
        await avaxBlockDispatcher.apply();
        const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
        expect(blocksCount).to.be.eq(0);
      });

      it.skip('does not execute transaction', async () => {
        const executeTxSpy = sinon.spy(avaxBlockDispatcher, <any>'executeTx');
        await avaxBlockDispatcher.apply();
        expect(executeTxSpy.notCalled).to.be.true;
      });
    });

    describe('when it fails to submit transaction', () => {
      describe('when the error is nonce has already been used', () => {
        beforeEach(() => {
          mockedChainContract.submit.rejects({
            message: 'nonce has already been used',
          });
          mockedBlockchain.wallet.getNextNonce = async () => 1;
        });

        it.skip('retries submitTx with different nonce', async () => {
          const submitTxSpy = sinon.spy(avaxBlockDispatcher, <any>'sendTx');
          const loggerSpy = sinon.spy(mockedLogger, 'warn');
          await avaxBlockDispatcher.apply();

          expect(submitTxSpy.calledTwice).to.be.true;
          expect(loggerSpy).to.have.been.calledWith('[avax] Submit tx with nonce 1 failed. Retrying with 2');
        });
      });

      describe('when transaction timeout', () => {
        beforeEach(() => {
          mockedChainContract.submit.resolves(undefined);
        });

        it.skip('does not retries submitTx with different nonce', async () => {
          const loggerSpy = sinon.spy(mockedLogger, 'warn');
          await avaxBlockDispatcher.apply();
          expect(loggerSpy).to.have.been.calledWith('[avax][LAYER2] canceling tx 0x1234');
        });

        it.skip('does not save block to database', async () => {
          await avaxBlockDispatcher.apply();
          const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
          expect(blocksCount).to.be.eq(0);
        });

        it.skip('does call execute cancelPendingTransaction', async () => {
          const executeTxSpy = sinon.spy(avaxBlockDispatcher, <any>'cancelPendingTransaction');
          await avaxBlockDispatcher.apply();
          expect(executeTxSpy).to.have.been.called;
        });
      });
    });
  });
});
