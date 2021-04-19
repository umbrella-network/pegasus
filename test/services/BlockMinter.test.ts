/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import BlockMinter from '../../src/services/BlockMinter';
import SignatureCollector from '../../src/services/SignatureCollector';
import {Container} from 'inversify';
import sinon from 'sinon';
import {expect} from 'chai';
import {BigNumber, ethers, Wallet} from 'ethers';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';

import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from '../../src/services/FeedProcessor';
import RevertedBlockResolver from '../../src/services/RevertedBlockResolver';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import SaveMintedBlock from '../../src/services/SaveMintedBlock';
import Settings from '../../src/types/Settings';
import Leaf from '../../src/models/Leaf';
import Block from '../../src/models/Block';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {loadTestEnv} from '../helpers/loadTestEnv';
import TimeService from '../../src/services/TimeService';

describe('BlockMinter', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedTimeService: sinon.SinonStubbedInstance<TimeService>;
  let mockedRevertedBlockResolver: sinon.SinonStubbedInstance<RevertedBlockResolver>;
  let settings: Settings;
  let blockMinter: BlockMinter;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    await getModelForClass(Block).deleteMany({});
    await getModelForClass(Leaf).deleteMany({});

    const container = new Container();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedTimeService = sinon.createStubInstance(TimeService);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedSignatureCollector = sinon.createStubInstance(SignatureCollector);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    mockedRevertedBlockResolver = sinon.createStubInstance(RevertedBlockResolver);
    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      dataTimestampOffsetSeconds: 0,
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(SignatureCollector).toConstantValue((mockedSignatureCollector as unknown) as SignatureCollector);
    container.bind(FeedProcessor).toConstantValue((mockedFeedProcessor as unknown) as FeedProcessor);
    container.bind(SortedMerkleTreeFactory).toSelf();
    container.bind(SaveMintedBlock).toSelf();
    container.bind(TimeService).toConstantValue(mockedTimeService);
    container.bind('Settings').toConstantValue(settings);
    container.bind(RevertedBlockResolver).toConstantValue(mockedRevertedBlockResolver);

    container.bind(BlockMinter).to(BlockMinter);

    blockMinter = container.get(BlockMinter);
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await getModelForClass(Leaf).deleteMany({});
    await mongoose.connection.close();
  });

  describe('#sortLeaves', () => {
    it("sorts leaves based on leaf's label", async () => {
      const leaves: Leaf[] = [
        {label: 'b', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0'},
        {label: 'a', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0'},
        {label: 'd', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0'},
        {label: 'c', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0'},
      ];
      const resultingLeaves = BlockMinter.sortLeaves(leaves);

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
      const affidavit = BlockMinter.generateAffidavit(
        1,
        ethers.utils.keccak256('0x1234'),
        BigNumber.from(1),
        ['ETH-USD'],
        [100],
      );

      expect(affidavit)
        .to.be.a('string')
        .that.matches(/^0x[0-9a-fA-F]{64}$/, 'generated affidavit is not a valid hex string');
    });
  });

  describe('#signAffidavitWithWallet', () => {
    it('signes affidavit successfully', async () => {
      const {affidavit} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signedAffidavit = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      expect(signedAffidavit)
        .to.be.a('string')
        .that.matches(/^0x[0-9a-fA-F]+$/, 'generated affidavit is not a valid hex string');
    });
  });

  describe('#recoverSigner', () => {
    it("recovers signer's address", async () => {
      const {affidavit} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signedAffidavit = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      const signersAddress = BlockMinter.recoverSigner(affidavit, signedAffidavit);

      expect(signersAddress).to.be.eq(wallet.address);
    });
  });

  describe('#apply', () => {
    it('does not try to get new feed data if you are not the leader', async () => {
      const wallet = Wallet.createRandom();
      mockedBlockchain.wallet = wallet;

      mockedChainContract.resolveStatus.resolves({
        blockNumber: BigNumber.from(1),
        lastBlockHeight: BigNumber.from(0),
        nextBlockHeight: BigNumber.from(1),
        nextLeader: Wallet.createRandom().address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: BigNumber.from(1),
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      });

      await blockMinter.apply();

      expect(mockedFeedProcessor.apply.notCalled).to.be.true;
    });

    it('does not try to get new feed data if there is the same round', async () => {
      const wallet = Wallet.createRandom();
      mockedBlockchain.wallet = wallet;

      mockedChainContract.resolveStatus.resolves({
        blockNumber: BigNumber.from(1),
        lastBlockHeight: BigNumber.from(1),
        nextBlockHeight: BigNumber.from(1),
        nextLeader: wallet.address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: BigNumber.from(1),
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      });

      await blockMinter.apply();

      expect(mockedFeedProcessor.apply.notCalled).to.be.true;
    });

    it('passes right arguments to SignatureCollector', async () => {
      const {leaf, affidavit, fcd} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signature = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      mockedBlockchain.wallet = wallet;

      mockedTimeService.apply.returns(10);

      mockedChainContract.resolveStatus.resolves({
        blockNumber: BigNumber.from(1),
        lastBlockHeight: BigNumber.from(0),
        nextBlockHeight: BigNumber.from(1),
        nextLeader: wallet.address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: BigNumber.from(1),
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      });

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);
      mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);
      mockedSignatureCollector.apply.resolves([signature]);

      await blockMinter.apply();

      expect(mockedSignatureCollector.apply.args[0][0]).to.be.deep.eq(
        {
          dataTimestamp: 10,
          blockHeight: 1,
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
      const wallet = Wallet.createRandom();
      const signature = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      mockedBlockchain.wallet = wallet;

      mockedTimeService.apply.returns(10);

      mockedChainContract.resolveStatus.resolves({
        blockNumber: BigNumber.from(1),
        lastBlockHeight: BigNumber.from(0),
        nextBlockHeight: BigNumber.from(1),
        nextLeader: wallet.address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: BigNumber.from(1),
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      });

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);

      mockedFeedProcessor.apply.resolves([
        [leaf, leaf],
        [leaf, leaf],
      ]);
      mockedSignatureCollector.apply.resolves([signature]);
      mockedChainContract.submit.rejects(); // throw error when trying to submit minted block

      await blockMinter.apply();

      const blocksCount = await getModelForClass(Block).count({}).exec();
      expect(blocksCount).to.be.eq(0, 'BlockMinter saved some blocks to database');
    });

    it('saves block to database if submitting finished successfully', async () => {
      const {leaf, affidavit} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signature = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      mockedBlockchain.wallet = wallet;

      mockedTimeService.apply.returns(10);

      mockedChainContract.resolveStatus.resolves({
        blockNumber: BigNumber.from(1),
        lastBlockHeight: BigNumber.from(0),
        nextBlockHeight: BigNumber.from(1),
        nextLeader: wallet.address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: BigNumber.from(1),
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      });

      mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);

      mockedFeedProcessor.apply.resolves([
        [leaf, leaf],
        [leaf, leaf],
      ]);
      mockedSignatureCollector.apply.resolves([signature]);
      mockedChainContract.submit.resolves({
        wait: () => Promise.resolve({status: 1, transactionHash: '123'}),
      } as any); // throw error when trying to submit minted block

      await blockMinter.apply();

      const blocksCount = await getModelForClass(Block).count({}).exec();
      expect(blocksCount).to.be.eq(1);
    });
  });
});
