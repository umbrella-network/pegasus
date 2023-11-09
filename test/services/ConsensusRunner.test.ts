import 'reflect-metadata';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {BigNumber, Wallet} from 'ethers';

import {mockedLogger} from '../mocks/logger.js';
import Blockchain from '../../src/lib/Blockchain.js';
import ChainContract from '../../src/blockchains/evm/contracts/ChainContract.js';
import Settings from '../../src/types/Settings.js';
import ConsensusRunner from '../../src/services/ConsensusRunner.js';
import TimeService from '../../src/services/TimeService.js';
import SignatureCollector from '../../src/services/SignatureCollector.js';
import BlockRepository from '../../src/repositories/BlockRepository.js';
import {Validator} from '../../src/types/Validator.js';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit.js';
import {BlockSignerResponseWithPower} from '../../src/types/BlockSignerResponse.js';
import {signAffidavitWithWallet} from '../../src/utils/mining.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import {FeedDataService} from '../../src/services/FeedDataService.js';
import {mockIWallet} from '../helpers/mockIWallet.js';

chai.use(chaiAsPromised);

describe('ConsensusRunner', () => {
  let settings: Settings;
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedTimeService: sinon.SinonStubbedInstance<TimeService>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedBlockRepository: sinon.SinonStubbedInstance<BlockRepository>;
  let mockedFeedDataService: sinon.SinonStubbedInstance<FeedDataService>;

  let consensusRunner: ConsensusRunner;
  const leaderWallet = Wallet.createRandom();

  beforeEach(async () => {
    const container = getTestContainer();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedTimeService = sinon.createStubInstance(TimeService);
    mockedSignatureCollector = sinon.createStubInstance(SignatureCollector);
    mockedBlockRepository = sinon.createStubInstance(BlockRepository);
    mockedFeedDataService = sinon.createStubInstance(FeedDataService);

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
      consensus: {
        retries: 2,
      },
      version: '1',
      blockchain: {
        wallets: {
          evm: {
            privateKey: leaderWallet.privateKey,
          },
        },
      },
    } as Settings;

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);

    container.bind(BlockRepository).toConstantValue(mockedBlockRepository as unknown as BlockRepository);
    container.bind(TimeService).toConstantValue(mockedTimeService);
    container.bind(SignatureCollector).toConstantValue(mockedSignatureCollector as unknown as SignatureCollector);
    container.bind(FeedDataService).toConstantValue(mockedFeedDataService);

    consensusRunner = container.get(ConsensusRunner);
  });

  it('return empty object when not enough votes', async () => {
    mockedBlockchain.wallet = mockIWallet(leaderWallet);
    const {leaf, affidavit} = leafWithAffidavit;

    mockedFeedDataService.apply.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(10),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet.getRawWallet(), affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    const dataTimestamp = 1621509082;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(10),
        id: '123',
      },
    ];

    await expect(consensusRunner.apply(dataTimestamp, validators, 1)).to.be.empty;
  });

  it('return empty object when not enough signatures', async () => {
    mockedBlockchain.wallet = mockIWallet(Wallet.createRandom());
    const {leaf, affidavit} = leafWithAffidavit;

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(15),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet.getRawWallet(), affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    mockedFeedDataService.apply.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

    const dataTimestamp = 1621509082;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(15),
        id: '123',
      },
    ];

    await expect(consensusRunner.apply(dataTimestamp, validators, 2)).to.be.empty;
  });

  it('consensus is successful', async () => {
    mockedBlockchain.wallet = mockIWallet(Wallet.createRandom());

    const {leaf, affidavit} = leafWithAffidavit;

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [],
        power: BigNumber.from(15),
        signature: await signAffidavitWithWallet(mockedBlockchain.wallet.getRawWallet(), affidavit),
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    mockedFeedDataService.apply.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

    const dataTimestamp = 1621509082;
    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(15),
        id: '123',
      },
    ];

    expect((await consensusRunner.apply(dataTimestamp, validators, 1))?.dataTimestamp).to.be.equals(dataTimestamp);
  });

  it('discrepancy found', async () => {
    mockedBlockchain.wallet = mockIWallet(Wallet.createRandom());

    mockedSignatureCollector.apply.resolves([
      {
        discrepancies: [{key: 'ETH-USD', discrepancy: 10}],
        power: BigNumber.from(15),
        signature: '',
        version: '1',
      },
    ] as BlockSignerResponseWithPower[]);

    const {leaf} = leafWithAffidavit;

    mockedFeedDataService.apply.resolves({
      firstClassLeaves: [leaf],
      leaves: [leaf],
      fcdsFeeds: {},
      leavesFeeds: {},
    });

    const dataTimestamp = 1621509082;

    const validators: Validator[] = [
      {
        location: 'http://abc.zyz',
        power: BigNumber.from(15),
        id: '123',
      },
    ];

    const result = await consensusRunner.apply(dataTimestamp, validators, 1);
    expect(result).to.not.be.undefined;
    expect(result?.dataTimestamp).to.be.equals(undefined);
  });
});
