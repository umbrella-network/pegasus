import 'reflect-metadata';
import {Container} from 'inversify';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from '../../src/services/FeedProcessor';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import Settings from '../../src/types/Settings';
import ConsensusRunner from '../../src/services/ConsensusRunner';
import TimeService from '../../src/services/TimeService';
import SignatureCollector from '../../src/services/SignatureCollector';
import BlockRepository from '../../src/services/BlockRepository';
import {Validator} from '../../src/types/Validator';
import {BigNumber, Wallet} from 'ethers';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {BlockSignerResponseWithPower} from '../../src/types/BlockSignerResponse';
import {signAffidavitWithWallet} from '../../src/utils/mining';

chai.use(chaiAsPromised);

describe('ConsensusRunner', () => {
  let settings: Settings;
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedTimeService: sinon.SinonStubbedInstance<TimeService>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedBlockRepository: sinon.SinonStubbedInstance<BlockRepository>;

  let consensusRunner: ConsensusRunner;

  beforeEach(async () => {
    const container = new Container();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    mockedTimeService = sinon.createStubInstance(TimeService);
    mockedSignatureCollector = sinon.createStubInstance(SignatureCollector);
    mockedBlockRepository = sinon.createStubInstance(BlockRepository);

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      consensus: {
        retries: 2,
      },
      version: '1',
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);

    container.bind(BlockRepository).toConstantValue(mockedBlockRepository as unknown as BlockRepository);
    container.bind(TimeService).toConstantValue(mockedTimeService);
    container.bind(SignatureCollector).toConstantValue(mockedSignatureCollector as unknown as SignatureCollector);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor as unknown as FeedProcessor);
    container.bind(SortedMerkleTreeFactory).toSelf();

    container.bind(ConsensusRunner).to(ConsensusRunner);

    consensusRunner = container.get(ConsensusRunner);
  });

  it('return empty object when not enough votes', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();

    const {leaf, affidavit} = leafWithAffidavit;

    mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(10),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet, affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    const dataTimestamp = 1621509082;
    const blockHeight = 234;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(10),
        id: '123',
      },
    ];
    const staked = BigNumber.from(20);

    await expect(consensusRunner.apply(dataTimestamp, blockHeight, validators, staked, 1)).to.be.empty;
  });

  it('return empty object when not enough signatures', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();

    const {leaf, affidavit} = leafWithAffidavit;

    mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(15),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet, affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    const dataTimestamp = 1621509082;
    const blockHeight = 234;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(15),
        id: '123',
      },
    ];
    const staked = BigNumber.from(20);

    await expect(consensusRunner.apply(dataTimestamp, blockHeight, validators, staked, 2)).to.be.empty;
  });

  it('consensus is successful', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();

    const {leaf, affidavit} = leafWithAffidavit;

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(15),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet, affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

    const dataTimestamp = 1621509082;
    const blockHeight = 234;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(15),
        id: '123',
      },
    ];
    const staked = BigNumber.from(20);

    expect(
      (await consensusRunner.apply(dataTimestamp, blockHeight, validators, staked, 1))?.dataTimestamp,
    ).to.be.equals(dataTimestamp);
  });

  it('discrepancy found', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [{key: 'ETH-USD', discrepancy: 10}],
        power: BigNumber.from(15),
        signature: '',
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    const {leaf} = leafWithAffidavit;

    mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

    const dataTimestamp = 1621509082;
    const blockHeight = 234;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(15),
        id: '123',
      },
    ];
    const staked = BigNumber.from(20);

    expect(
      (await consensusRunner.apply(dataTimestamp, blockHeight, validators, staked, 1))?.dataTimestamp,
    ).to.be.equals(undefined);
  });
});
