import 'reflect-metadata';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {BigNumber, Wallet} from 'ethers';

import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import Settings from '../../src/types/Settings';
import ConsensusRunner from '../../src/services/ConsensusRunner';
import TimeService from '../../src/services/TimeService';
import SignatureCollector from '../../src/services/SignatureCollector';
import BlockRepository from '../../src/services/BlockRepository';
import {Validator} from '../../src/types/Validator';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {BlockSignerResponseWithPower} from '../../src/types/BlockSignerResponse';
import {signAffidavitWithWallet} from '../../src/utils/mining';
import {getTestContainer} from '../helpers/getTestContainer';
import {ConsensusDataService} from '../../src/services/consensus/ConsensusDataService';

chai.use(chaiAsPromised);

describe('ConsensusRunner', () => {
  let settings: Settings;
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedTimeService: sinon.SinonStubbedInstance<TimeService>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedBlockRepository: sinon.SinonStubbedInstance<BlockRepository>;
  let mockedConsensusDataService: sinon.SinonStubbedInstance<ConsensusDataService>;

  let consensusRunner: ConsensusRunner;

  beforeEach(async () => {
    const container = getTestContainer();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedTimeService = sinon.createStubInstance(TimeService);
    mockedSignatureCollector = sinon.createStubInstance(SignatureCollector);
    mockedBlockRepository = sinon.createStubInstance(BlockRepository);
    mockedConsensusDataService = sinon.createStubInstance(ConsensusDataService);

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      consensus: {
        retries: 2,
      },
      version: '1',
    } as Settings;

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);

    container.bind(BlockRepository).toConstantValue(mockedBlockRepository as unknown as BlockRepository);
    container.bind(TimeService).toConstantValue(mockedTimeService);
    container.bind(SignatureCollector).toConstantValue(mockedSignatureCollector as unknown as SignatureCollector);
    container.bind(ConsensusDataService).toConstantValue(mockedConsensusDataService);

    consensusRunner = container.get(ConsensusRunner);
  });

  it('return empty object when not enough votes', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();
    const {leaf, affidavit} = leafWithAffidavit;

    mockedConsensusDataService.getLeavesAndFeeds.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

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

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(15),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet, affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    mockedConsensusDataService.getLeavesAndFeeds.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

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

    mockedConsensusDataService.getLeavesAndFeeds.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

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

    const {leaf, feed} = leafWithAffidavit;

    mockedConsensusDataService.getLeavesAndFeeds.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: feed,
      leavesFeeds: feed,
    });

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
    const result = await consensusRunner.apply(dataTimestamp, blockHeight, validators, staked, 1);
    expect(result).to.not.be.undefined;
    expect(result?.dataTimestamp).to.be.equals(undefined);
  });
});
