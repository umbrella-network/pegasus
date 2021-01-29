import 'reflect-metadata';
import BlockSigner from '../../src/services/BlockSigner';
import { Container } from 'inversify'
import sinon from 'sinon'
import { mockedLogger } from '../mocks/logger'
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from "../../src/services/FeedProcessor";
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import Settings from "../../src/types/Settings";
import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers'
import BlockMinter from '../../src/services/BlockMinter';
import { leafWithAffidavit } from '../fixtures/leafWithAffidavit';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

describe('BlockSigner', () => {
  let settings: Settings;
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  
  let blockSigner: BlockSigner;

  beforeEach(async () => {
    const container = new Container()

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    settings = {
      feedsFile: 'src/config/feeds.yaml',
      feedsOnChain: 'src/config/feedsOnChain.yaml',
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind('Settings').toConstantValue(settings);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor  as unknown as FeedProcessor);
    container.bind(SortedMerkleTreeFactory).toSelf();

    container.bind(BlockSigner).to(BlockSigner);

    blockSigner = container.get(BlockSigner);
  })

  it('throws error if you are the leader', async () => {
    const wallet = Wallet.createRandom();
    mockedBlockchain.wallet = wallet;
    mockedChainContract.getLeaderAddress.resolves(wallet.address);

    await expect(blockSigner.apply({
      blockHeight: 1,
      fcd: { 'ETH-USD': 100 },
      leaves: { 'ETH-USD': 100 },
      signature: '0x00',
    })).to.be.rejectedWith('You are the leader, and you should not sign your block again.')
  })

  it('throws error if submitted block is not the current one', async () => {
    mockedBlockchain.wallet = Wallet.createRandom();
    mockedChainContract.getLeaderAddress.resolves(Wallet.createRandom().address);
    mockedChainContract.getBlockHeight.resolves(BigNumber.from(2))

    await expect(blockSigner.apply({
      blockHeight: 1,
      fcd: { 'ETH-USD': 100 },
      leaves: { 'ETH-USD': 100 },
      signature: '0x00',
    })).to.be.rejectedWith('Does not match with the current block 2.')
  })

  it('throws error if signatures does not match', async () => {
    const { affidavit, fcd } = leafWithAffidavit

    const wallet = Wallet.createRandom();

    const signature = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

    mockedBlockchain.wallet = wallet;
    mockedChainContract.getLeaderAddress.resolves(Wallet.createRandom().address);
    mockedChainContract.getBlockHeight.resolves(BigNumber.from(1))

    await expect(blockSigner.apply({
      blockHeight: 1,
      fcd: fcd,
      leaves: fcd,
      signature: signature,
    })).to.be.rejectedWith('Signature does not belong to the current leader')
  })


  it('returns validator\'s signature', async () => {
    const { affidavit, fcd, leaf } = leafWithAffidavit

    const leaderWallet = Wallet.createRandom()
    const wallet = Wallet.createRandom();

    const signature = await BlockMinter.signAffidavitWithWallet(leaderWallet, affidavit);

    mockedBlockchain.wallet = wallet;
    mockedChainContract.getLeaderAddress.resolves(leaderWallet.address);
    mockedChainContract.getBlockHeight.resolves(BigNumber.from(1))
    mockedFeedProcessor.apply.resolves([leaf]);

    const result = await blockSigner.apply({
      blockHeight: 1,
      fcd: fcd,
      leaves: fcd,
      signature: signature,
    });

    expect(result).to.be.a('string').that.matches(/^0x[0-9a-fA-F]+$/);
  })
})
