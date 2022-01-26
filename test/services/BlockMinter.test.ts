/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import BlockMinter from '../../src/services/BlockMinter';
import SignatureCollector from '../../src/services/SignatureCollector';
import sinon from 'sinon';
import {expect} from 'chai';
import {BigNumber, ethers, Wallet} from 'ethers';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';

import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import ConsensusRunner from '../../src/services/ConsensusRunner';
import FeedProcessor from '../../src/services/FeedProcessor';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import Settings from '../../src/types/Settings';
import Leaf from '../../src/types/Leaf';
import Block from '../../src/models/Block';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {loadTestEnv} from '../helpers/loadTestEnv';
import TimeService from '../../src/services/TimeService';
import {generateAffidavit, recoverSigner, signAffidavitWithWallet, sortLeaves, timestamp} from '../../src/utils/mining';
import GasEstimator from '../../src/services/GasEstimator';
import BlockRepository from '../../src/services/BlockRepository';
import {getTestContainer} from '../helpers/getTestContainer';
import {Logger, parseEther} from 'ethers/lib/utils';

// TODO: This is a unit test - we should not be calling the real ConsensusRunner.
describe('BlockMinter', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedTimeService: sinon.SinonStubbedInstance<TimeService>;
  let mockedGasEstimator: sinon.SinonStubbedInstance<GasEstimator>;
  let settings: Settings;
  let blockMinter: BlockMinter;
  let wallet: Wallet;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    await getModelForClass(Block).deleteMany({});

    const container = getTestContainer();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedTimeService = sinon.createStubInstance(TimeService);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedSignatureCollector = sinon.createStubInstance(SignatureCollector);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    mockedGasEstimator = sinon.createStubInstance(GasEstimator);

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      dataTimestampOffsetSeconds: 0,
      consensus: {
        retries: 2,
      },
      version: '1.0.0',
      blockchain: {
        transactions: {
          waitForBlockTime: 1000,
          mintBalance: {
            warningLimit: '0.15',
            errorLimit: '0.015',
          },
        },
      },
    } as Settings;

    wallet = Wallet.createRandom();
    mockedBlockchain.wallet = wallet;
    mockedBlockchain.wallet.getBalance = async () => parseEther('10');

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(SignatureCollector).toConstantValue(mockedSignatureCollector as unknown as SignatureCollector);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor as unknown as FeedProcessor);
    container.bind(SortedMerkleTreeFactory).toSelf();
    container.bind(BlockRepository).toSelf();
    container.bind(ConsensusRunner).toSelf();
    container.bind(TimeService).toConstantValue(mockedTimeService);
    container.bind(GasEstimator).toConstantValue(mockedGasEstimator);

    container.bind(BlockMinter).to(BlockMinter);

    blockMinter = container.get(BlockMinter);
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await mongoose.connection.close();
  });

  describe('#sortLeaves', () => {
    it("sorts leaves based on leaf's label", async () => {
      const leaves: Leaf[] = [
        {label: 'b', valueBytes: '0x0'},
        {label: 'a', valueBytes: '0x0'},
        {label: 'd', valueBytes: '0x0'},
        {label: 'c', valueBytes: '0x0'},
      ];
      const resultingLeaves = sortLeaves(leaves);

      resultingLeaves.forEach((leaf, i) => {
        if (i === 0) {
          return;
        }

        expect(leaf.label >= resultingLeaves[i - 1].label).to.be.eq(true, 'not sorted');
      });
    });
  });

  describe('#generateAffidavit', () => {
    it('generates affidavit successfully', () => {
      const affidavit = generateAffidavit(1, ethers.utils.keccak256('0x1234'), ['ETH-USD'], ['0xABCD']);

      expect(affidavit)
        .to.be.a('string')
        .that.matches(/^0x[0-9a-fA-F]{64}$/, 'generated affidavit is not a valid hex string');
    });
  });

  describe('#signAffidavitWithWallet', () => {
    it('signes affidavit successfully', async () => {
      const {affidavit} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signedAffidavit = await signAffidavitWithWallet(wallet, affidavit);

      expect(signedAffidavit)
        .to.be.a('string')
        .that.matches(/^0x[0-9a-fA-F]+$/, 'generated affidavit is not a valid hex string');
    });
  });

  describe('#recoverSigner', () => {
    it("recovers signer's address", async () => {
      const {affidavit} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signedAffidavit = await signAffidavitWithWallet(wallet, affidavit);

      const signersAddress = recoverSigner(affidavit, signedAffidavit);

      expect(signersAddress).to.be.eq(wallet.address);
    });
  });

  describe('#apply', () => {
    it('does not try to get new feed data if you are not the leader', async () => {
      mockedChainContract.resolveStatus.resolves([
        '0x123',
        {
          blockNumber: BigNumber.from(1),
          timePadding: 10,
          lastBlockId: 1,
          nextBlockId: 2,
          nextLeader: Wallet.createRandom().address,
          validators: [wallet.address, 'leader'],
          locations: ['abc'],
          lastDataTimestamp: timestamp(),
          powers: [BigNumber.from(1)],
          staked: BigNumber.from(1),
          minSignatures: 1,
        },
      ]);

      await blockMinter.apply();

      expect(mockedFeedProcessor.apply.notCalled).to.be.true;
    });

    it('does not try to get new feed data if there is the same round', async () => {
      mockedChainContract.resolveStatus.resolves([
        '0x123',
        {
          blockNumber: BigNumber.from(1),
          timePadding: 100,
          lastBlockId: 1,
          nextBlockId: 1,
          nextLeader: wallet.address,
          validators: [wallet.address],
          locations: ['abc'],
          lastDataTimestamp: timestamp(),
          powers: [BigNumber.from(1)],
          staked: BigNumber.from(1),
          minSignatures: 1,
        },
      ]);

      await blockMinter.apply();

      expect(mockedFeedProcessor.apply.notCalled).to.be.true;
    });

    it('passes right arguments to SignatureCollector', async () => {
      const {leaf, affidavit, fcd, timestamp} = leafWithAffidavit;
      const signature = await signAffidavitWithWallet(wallet, affidavit);

      mockedTimeService.apply.returns(timestamp);

      mockedChainContract.resolveStatus.resolves([
        '0x123',
        {
          blockNumber: BigNumber.from(1),
          timePadding: 1,
          lastBlockId: 0,
          nextBlockId: 1,
          nextLeader: wallet.address,
          validators: [wallet.address],
          locations: ['abc'],
          lastDataTimestamp: 1,
          powers: [BigNumber.from(1)],
          staked: BigNumber.from(1),
          minSignatures: 1,
        },
      ]);

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);
      mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);
      mockedBlockchain.getBlockNumber.onCall(0).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(1).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(2).resolves(2);

      mockedSignatureCollector.apply.resolves([
        {signature, power: BigNumber.from(1), discrepancies: [], version: '1.0.0'},
      ]);

      await blockMinter.apply();

      expect(mockedSignatureCollector.apply.args[0][0]).to.be.deep.eq(
        {
          dataTimestamp: timestamp,
          fcd: fcd,
          leaves: fcd,
          signature,
        },
        'the first argument passed to SignatureCollector is not eq to expected block',
      );

      expect(mockedSignatureCollector.apply.args[0][1]).to.be.eq(
        affidavit,
        'the second argument is not the right affidavit',
      );
    });

    it('does not save block to database if submitting finished unsuccessfully', async () => {
      const {leaf, affidavit} = leafWithAffidavit;
      const signature = await signAffidavitWithWallet(wallet, affidavit);

      mockedBlockchain.wallet = wallet;

      mockedTimeService.apply.returns(10);

      mockedChainContract.resolveStatus.resolves([
        '0x123',
        {
          blockNumber: BigNumber.from(1),
          timePadding: 1,
          lastBlockId: 0,
          nextBlockId: 1,
          nextLeader: wallet.address,
          validators: [wallet.address],
          locations: ['abc'],
          lastDataTimestamp: 1,
          powers: [BigNumber.from(1)],
          staked: BigNumber.from(1),
          minSignatures: 1,
        },
      ]);

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);
      mockedBlockchain.getBlockNumber.onCall(0).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(1).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(2).resolves(2);

      mockedFeedProcessor.apply.resolves([
        [leaf, leaf],
        [leaf, leaf],
      ]);
      mockedSignatureCollector.apply.resolves([
        {signature, power: BigNumber.from(1), discrepancies: [], version: '1.0.0'},
      ]);
      mockedChainContract.submit.rejects(); // throw error when trying to submit minted block

      await blockMinter.apply();

      const blocksCount = await getModelForClass(Block).count({}).exec();
      expect(blocksCount).to.be.eq(0, 'BlockMinter saved some blocks to database');
    });

    it('does not save block to database if balance is lower than mintBalance.errorLimit', async () => {
      const executeTxSpy = sinon.spy(blockMinter, <any>'executeTx');

      let error = undefined;

      mockedBlockchain.wallet.getBalance = async () => parseEther('0');

      try {
        await blockMinter.apply();
      } catch (err) {
        error = err;
      }
      const blocksCount = await getModelForClass(Block).countDocuments({}).exec();

      expect(error).to.be.instanceOf(Error);
      expect(error.message).to.be.equal('Balance is lower than 0.015');
      expect(executeTxSpy.notCalled).to.be.true;
      expect(blocksCount).to.be.eq(0);
    });

    it('does log message if balance is between mintBalance.warningLimit and mintBalance.errorLimit', async () => {
      const {leaf, affidavit, timestamp} = leafWithAffidavit;
      const signature = await signAffidavitWithWallet(wallet, affidavit);

      mockedBlockchain.wallet.getBalance = async () => parseEther('0.10');

      mockedTimeService.apply.returns(timestamp);

      mockedChainContract.resolveStatus.resolves([
        '0x123',
        {
          blockNumber: BigNumber.from(1),
          timePadding: 1,
          lastBlockId: 0,
          nextBlockId: 1,
          nextLeader: wallet.address,
          validators: [wallet.address],
          locations: ['abc'],
          lastDataTimestamp: 1,
          powers: [BigNumber.from(1)],
          staked: BigNumber.from(1),
          minSignatures: 1,
        },
      ]);

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);
      mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);
      mockedBlockchain.getBlockNumber.onCall(0).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(1).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(2).resolves(2);

      mockedSignatureCollector.apply.resolves([
        {signature, power: BigNumber.from(1), discrepancies: [], version: '1.0.0'},
      ]);

      const loggerSpy = sinon.spy(mockedLogger, 'warn');

      await blockMinter.apply();

      expect(loggerSpy.called).to.be.true;
      loggerSpy.restore();
    });

    it('saves block to database if submitting finished successfully', async () => {
      const {leaf, affidavit} = leafWithAffidavit;
      const signature = await signAffidavitWithWallet(wallet, affidavit);

      mockedBlockchain.wallet = wallet;
      mockedBlockchain.wallet.getBalance = async () => parseEther('10');

      mockedTimeService.apply.returns(10);
      mockedGasEstimator.apply.resolves({min: 10, estimation: 10, max: 10, avg: 10});

      mockedChainContract.resolveStatus.resolves([
        '0x123',
        {
          blockNumber: BigNumber.from(1),
          timePadding: 0,
          lastBlockId: 1,
          nextBlockId: 1,
          nextLeader: wallet.address,
          validators: [wallet.address],
          locations: ['abc'],
          lastDataTimestamp: 1,
          powers: [BigNumber.from(1)],
          staked: BigNumber.from(1),
          minSignatures: 1,
        },
      ]);

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);

      mockedFeedProcessor.apply.resolves([
        [leaf, leaf],
        [leaf, leaf],
      ]);

      mockedSignatureCollector.apply.resolves([
        {signature, power: BigNumber.from(1), discrepancies: [], version: '1.0.0'},
      ]);

      mockedChainContract.submit.resolves({
        wait: () =>
          Promise.resolve({
            status: 1,
            transactionHash: '123',
            logs: [
              {
                transactionIndex: 0,
                blockNumber: 6618,
                transactionHash: '0x17063b26e48f5d9862688aac0ce693e2dfc4d8d9f230573c331e6616d7a85b55',
                address: '0xc4905364b78a742ccce7B890A89514061E47068D',
                topics: [
                  '0x5f11830295067c4bcc7d02d4e3b048cd7427be50a3aeb6afc9d3d559ee64bcfa',
                  '0x000000000000000000000000998cb7821e605cc16b6174e7c50e19adb2dd2fb0',
                ],
                data: '0x000000000000000000000000000000000000000000000000000000000000033f00000000000000000000000000000000000000000000000029a2241af62c00000000000000000000000000000000000000000000000000001bc16d674ec80000',
                logIndex: 1,
                blockHash: '0x7422c3bf9cda4cd91e282a495945d4b4ff310a06a67614e806bf6bb244527225',
              },
            ],
          }),
      } as any);

      mockedBlockchain.getBlockNumber.onCall(0).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(1).resolves(1);
      mockedBlockchain.getBlockNumber.onCall(2).resolves(2);

      await blockMinter.apply();

      const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
      expect(blocksCount).to.be.eq(1);
    });

    describe('when it fails to submit transaction', () => {
      it('retries submitTx with different nonce', async () => {
        const {leaf, affidavit} = leafWithAffidavit;

        const signature = await signAffidavitWithWallet(wallet, affidavit);

        mockedBlockchain.wallet = wallet;

        mockedBlockchain.wallet.getBalance = async () => parseEther('10');

        mockedBlockchain.wallet.getTransactionCount = async () => 1;

        mockedTimeService.apply.returns(10);
        mockedGasEstimator.apply.resolves({min: 10, estimation: 10, max: 10, avg: 10});

        mockedChainContract.resolveStatus.resolves([
          '0x123',
          {
            blockNumber: BigNumber.from(1),
            timePadding: 0,
            lastBlockId: 1,
            nextBlockId: 1,
            nextLeader: wallet.address,
            validators: [wallet.address],
            locations: ['abc'],
            lastDataTimestamp: 1,
            powers: [BigNumber.from(1)],
            staked: BigNumber.from(1),
            minSignatures: 1,
          },
        ]);

        mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);

        mockedChainContract.submit.rejects({
          message: 'nonce has already been used',
        });

        mockedFeedProcessor.apply.resolves([
          [leaf, leaf],
          [leaf, leaf],
        ]);

        mockedSignatureCollector.apply.resolves([
          {signature, power: BigNumber.from(1), discrepancies: [], version: '1.0.0'},
        ]);

        const loggerSpy = sinon.spy(mockedLogger, 'warn');
        const submitTxSpy = sinon.spy(blockMinter, <any>'submitTx');

        await blockMinter.apply();

        expect(submitTxSpy.calledTwice).to.be.true;
        expect(loggerSpy.calledOnceWith(sinon.match('Submit tx with nonce 1 failed. Retrying with 2'))).to.be.true;
      });
    });
  });
});
