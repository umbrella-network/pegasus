import 'reflect-metadata';
import {Container} from 'inversify';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {BigNumber, Wallet} from 'ethers';

import BlockSigner from '../../src/services/BlockSigner';
import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from '../../src/services/FeedProcessor';
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import Settings from '../../src/types/Settings';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {signAffidavitWithWallet, timestamp} from '../../src/utils/mining';

chai.use(chaiAsPromised);

describe('BlockSigner', () => {
  let settings: Settings;
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;

  let blockSigner: BlockSigner;

  beforeEach(async () => {
    const container = new Container();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(FeedProcessor).toConstantValue((mockedFeedProcessor as unknown) as FeedProcessor);
    container.bind(SortedMerkleTreeFactory).toSelf();

    container.bind(BlockSigner).to(BlockSigner);

    blockSigner = container.get(BlockSigner);
  });

  it('throws error if chain not ready', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();
    const nextLeader = Wallet.createRandom();

    const signature = await signAffidavitWithWallet(
      nextLeader,
      '0x631a4e7c2311787c7da16377b77f24bdd12a293dd7956789f1b5c6b16fe1e262',
    );

    mockedChainContract.resolveStatus.resolves([
      '0x123',
      {
        blockNumber: BigNumber.from(1),
        timePadding: 100,
        lastBlockId: 1,
        nextBlockId: 1,
        nextLeader: nextLeader.address,
        validators: [Wallet.createRandom().address],
        locations: ['abc'],
        lastDataTimestamp: timestamp(),
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      },
    ]);

    await expect(
      blockSigner.apply({
        dataTimestamp: 10,
        fcd: {'ETH-USD': 100},
        leaves: {'ETH-USD': 100},
        signature,
      }),
    ).to.be.rejectedWith('skipping 1: do not spam');
  });

  it('throws error if signatures does not match', async () => {
    const {affidavit, fcd, timestamp} = leafWithAffidavit;

    const wallet = Wallet.createRandom();

    const signature = await signAffidavitWithWallet(wallet, affidavit);

    const nextLeader = Wallet.createRandom().address;

    mockedBlockchain.wallet = Wallet.createRandom();

    mockedChainContract.resolveStatus.resolves([
      '0x123',
      {
        blockNumber: BigNumber.from(1),
        timePadding: 1,
        lastBlockId: 1,
        nextBlockId: 1,
        nextLeader,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: 1,
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      },
    ]);

    await expect(
      blockSigner.apply({
        dataTimestamp: timestamp,
        fcd: fcd,
        leaves: fcd,
        signature: signature,
      }),
    ).to.be.rejectedWith(
      `Signature does not belong to the current leader, expected ${nextLeader} got ${wallet.address}`,
    );
  });

  it('throws error if validator calls itself', async () => {
    const {affidavit, fcd, timestamp} = leafWithAffidavit;

    const wallet = Wallet.createRandom();

    const signature = await signAffidavitWithWallet(wallet, affidavit);

    mockedBlockchain.wallet = wallet;

    mockedChainContract.resolveStatus.resolves([
      '0x123',
      {
        blockNumber: BigNumber.from(1),
        timePadding: 1,
        lastBlockId: 1,
        nextBlockId: 1,
        nextLeader: wallet.address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: 1,
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      },
    ]);

    await expect(
      blockSigner.apply({
        dataTimestamp: timestamp,
        fcd: fcd,
        leaves: fcd,
        signature: signature,
      }),
    ).to.be.rejectedWith('You should not call yourself for signature.');
  });

  it("returns validator's signature", async () => {
    const {affidavit, fcd, leaf, timestamp} = leafWithAffidavit;

    const leaderWallet = Wallet.createRandom();
    const wallet = Wallet.createRandom();

    const signature = await signAffidavitWithWallet(leaderWallet, affidavit);

    mockedBlockchain.wallet = wallet;

    mockedChainContract.resolveStatus.resolves([
      '0x123',
      {
        blockNumber: BigNumber.from(1),
        timePadding: 1,
        lastBlockId: 1,
        nextBlockId: 1,
        nextLeader: leaderWallet.address,
        validators: [wallet.address],
        locations: ['abc'],
        lastDataTimestamp: 1,
        powers: [BigNumber.from(1)],
        staked: BigNumber.from(1),
      },
    ]);

    mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

    const result = await blockSigner.apply({
      dataTimestamp: timestamp,
      fcd,
      leaves: fcd,
      signature,
    });

    expect(result.signature)
      .to.be.a('string')
      .that.matches(/^0x[0-9a-fA-F]+$/);
  });
});
