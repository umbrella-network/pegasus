/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import BlockMinter from '../../src/services/BlockMinter';
import SignatureCollector from '../../src/services/SignatureCollector';
import sinon from 'sinon';
import {expect} from 'chai';
import {BigNumber, ethers, Wallet} from 'ethers';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';
import {GasEstimator} from '@umb-network/toolbox';

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
import BlockRepository from '../../src/services/BlockRepository';
import {getTestContainer} from '../helpers/getTestContainer';
import {parseEther} from 'ethers/lib/utils';
import {MultiChainStatusResolver} from '../../src/services/multiChain/MultiChainStatusResolver';
import {ChainsStatuses} from '../../src/types/ChainStatus';
import {ConsensusDataRepository} from '../../src/repositories/ConsensusDataRepository';
import {MultichainArchitectureDetector} from '../../src/services/MultichainArchitectureDetector';

const allStates: ChainsStatuses = {
  validators: ['0xabctest', '0xdeftest'],
  nextLeader: '0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0',
  chainsStatuses: [],
  chainsIdsReadyForBlock: [],
};

describe('BlockMinter', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedMultiChainStatusResolver: sinon.SinonStubbedInstance<MultiChainStatusResolver>;
  let mockedTimeService: sinon.SinonStubbedInstance<TimeService>;
  let mockedConsensusDataRepository: sinon.SinonStubbedInstance<ConsensusDataRepository>;
  let mockedMultichainArchitectureDetector: sinon.SinonStubbedInstance<MultichainArchitectureDetector>;
  let settings: Settings;
  let blockMinter: BlockMinter;
  let wallet: Wallet;

  before(async () => {
    sinon
      .stub(GasEstimator, 'apply')
      .resolves({isTxType2: true, min: 10, baseFeePerGas: 10, max: 10, avg: 10, gasPrice: 10});

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
    mockedMultiChainStatusResolver = sinon.createStubInstance(MultiChainStatusResolver);
    mockedConsensusDataRepository = sinon.createStubInstance(ConsensusDataRepository);
    mockedMultichainArchitectureDetector = sinon.createStubInstance(MultichainArchitectureDetector);

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      dataTimestampOffsetSeconds: 0,
      consensus: {
        retries: 2,
      },
      version: '1.0.0',
      blockchain: {
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
        masterChain: {
          chainId: 'bsc',
        },
      },
    } as Settings;

    wallet = Wallet.createRandom();
    mockedBlockchain.chainSettings = settings.blockchain.multiChains.bsc!;
    mockedBlockchain.wallet = wallet;
    mockedBlockchain.wallet = wallet;
    mockedBlockchain.wallet.getBalance = async () => parseEther('10');

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(SignatureCollector).toConstantValue(mockedSignatureCollector);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor);
    container.bind(SortedMerkleTreeFactory).toSelf();
    container.bind(BlockRepository).toSelf();
    container.bind(ConsensusRunner).toSelf();
    container.bind(MultiChainStatusResolver).toConstantValue(mockedMultiChainStatusResolver);
    container.bind(TimeService).toConstantValue(mockedTimeService);
    container.bind(ConsensusDataRepository).toConstantValue(mockedConsensusDataRepository);
    container.bind(MultichainArchitectureDetector).toConstantValue(mockedMultichainArchitectureDetector);

    container.bind(BlockMinter).to(BlockMinter);

    blockMinter = container.get(BlockMinter);
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(() => {
    sinon.restore();
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

      expect(signersAddress).to.be.eq(wallet.address.toLowerCase());
    });
  });

  describe('#apply', () => {
    describe('when balance is lower than mintBalance.errorLimit', () => {
      beforeEach(() => {
        mockedBlockchain.wallet.getBalance = async () => parseEther('0');
      });

      it('throws an error', async () => {
        await expect(blockMinter.apply()).to.be.rejectedWith(
          `[bsc] Balance (${wallet.address.slice(0, 10)}) is lower than 0.015`,
        );
      });
    });

    describe('when balance is lower than mintBalance.warnLimit', () => {
      beforeEach(() => {
        mockedMultichainArchitectureDetector.apply.resolves(true);
        allStates.chainsStatuses = [
          {
            chainAddress: '0x123',
            chainStatus: {
              blockNumber: BigNumber.from(1),
              timePadding: 10,
              lastBlockId: 1,
              nextBlockId: 2,
              nextLeader: wallet.address,
              validators: [wallet.address, 'leader'],
              locations: ['abc'],
              lastDataTimestamp: timestamp(),
              powers: [BigNumber.from(1)],
              staked: BigNumber.from(1),
              minSignatures: 1,
            },
            chainId: 'bsc',
          },
        ];

        allStates.chainsIdsReadyForBlock = ['bsc'];
        mockedMultiChainStatusResolver.apply.resolves(allStates);
        mockedBlockchain.wallet.getBalance = async () => parseEther('0.1');
      });

      it('logs a warning message', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'warn');
        await blockMinter.apply();
        expect(loggerSpy).to.have.been.calledWith(`[bsc] Balance (${wallet.address.slice(0, 10)}) is lower than 0.15`);
      });
    });

    it('does not try to get new feed data if you are not the leader', async () => {
      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: {
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
          chainId: 'bsc',
        },
      ];

      allStates.chainsIdsReadyForBlock = ['bsc'];
      mockedMultiChainStatusResolver.apply.resolves(allStates);
      await blockMinter.apply();

      expect(mockedFeedProcessor.apply.notCalled).to.be.true;
    });

    it('does not try to get new feed data if there are no chain ready', async () => {
      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: {
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
          chainId: 'bsc',
        },
      ];

      allStates.chainsIdsReadyForBlock = [];
      mockedMultiChainStatusResolver.apply.resolves(allStates);
      await blockMinter.apply();

      expect(mockedFeedProcessor.apply.notCalled).to.be.true;
    });

    it('passes right arguments to SignatureCollector', async () => {
      const {leaf, affidavit, fcd, timestamp} = leafWithAffidavit;
      const signature = await signAffidavitWithWallet(wallet, affidavit);

      mockedTimeService.apply.returns(timestamp);

      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: {
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
          chainId: 'bsc',
        },
      ];
      allStates.nextLeader = wallet.address;

      allStates.chainsIdsReadyForBlock = ['bsc'];
      mockedMultiChainStatusResolver.apply.resolves(allStates);
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

      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: {
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
          chainId: 'bsc',
        },
      ];

      allStates.chainsIdsReadyForBlock = ['bsc'];
      mockedMultiChainStatusResolver.apply.resolves(allStates);
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

    describe('when chain contract is old', () => {
      beforeEach(() => {
        mockedMultichainArchitectureDetector.apply.resolves(false);
        allStates.chainsStatuses = [
          {
            chainAddress: '0x123',
            chainStatus: {
              blockNumber: BigNumber.from(1),
              timePadding: 10,
              lastBlockId: 1,
              nextBlockId: 2,
              nextLeader: wallet.address,
              validators: [wallet.address, 'leader'],
              locations: ['abc'],
              lastDataTimestamp: timestamp(),
              powers: [BigNumber.from(1)],
              staked: BigNumber.from(1),
              minSignatures: 1,
            },
            chainId: 'bsc',
          },
        ];

        allStates.chainsIdsReadyForBlock = ['bsc'];
        mockedMultiChainStatusResolver.apply.resolves(allStates);
      });
    });

    describe('when chain contract is new', () => {
      beforeEach(() => {
        mockedMultichainArchitectureDetector.apply.resolves(true);
        allStates.chainsStatuses = [
          {
            chainAddress: '0x123',
            chainStatus: {
              blockNumber: BigNumber.from(1),
              timePadding: 10,
              lastBlockId: 1,
              nextBlockId: 2,
              nextLeader: wallet.address,
              validators: [wallet.address, 'leader'],
              locations: ['abc'],
              lastDataTimestamp: timestamp(),
              powers: [BigNumber.from(1)],
              staked: BigNumber.from(1),
              minSignatures: 1,
            },
            chainId: 'bsc',
          },
        ];

        allStates.chainsIdsReadyForBlock = ['bsc'];
        mockedMultiChainStatusResolver.apply.resolves(allStates);
      });

      it('select leader based on bsc chainStatus', async () => {
        const {leaf, affidavit, timestamp} = leafWithAffidavit;
        const signature = await signAffidavitWithWallet(wallet, affidavit);

        mockedTimeService.apply.returns(timestamp);
        mockedChainContract.resolveValidators.resolves([{id: wallet.address, location: 'abc'}]);
        mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);
        mockedBlockchain.getBlockNumber.onCall(0).resolves(1);
        mockedBlockchain.getBlockNumber.onCall(1).resolves(1);
        mockedBlockchain.getBlockNumber.onCall(2).resolves(2);

        mockedSignatureCollector.apply.resolves([
          {signature, power: BigNumber.from(1), discrepancies: [], version: '1.0.0'},
        ]);
        const loggerSpy = sinon.spy(mockedLogger, 'info');
        await blockMinter.apply();
        expect(loggerSpy).to.have.calledWith(`Next leader for ${timestamp}: ${allStates.nextLeader}, false`);
      });
    });
  });
});
