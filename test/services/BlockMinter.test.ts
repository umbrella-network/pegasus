import 'reflect-metadata';
import BlockMinter from '../../src/services/BlockMinter';
import SignatureCollector from '../../src/services/SignatureCollector';
import MintGuard from '../../src/services/MintGuard';
import { Container } from 'inversify'
import sinon from 'sinon'
import { mockedLogger } from '../mocks/logger'
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from "../../src/services/FeedProcessor";
import SortedMerkleTreeFactory from '../../src/services/SortedMerkleTreeFactory';
import SaveMintedBlock from '../../src/services/SaveMintedBlock';
import Settings from "../../src/types/Settings";
import Leaf from '../../src/models/Leaf';
import { leafWithAffidavit } from '../fixtures/leafWithAffidavit'
import { expect } from 'chai';
import { BigNumber, ethers, Wallet } from 'ethers'

describe('BlockMinter', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedSignatureCollector: sinon.SinonStubbedInstance<SignatureCollector>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedSortedMerkleTreeFactory: sinon.SinonStubbedInstance<SortedMerkleTreeFactory>;
  let mockedSaveMintedBlock: sinon.SinonStubbedInstance<SaveMintedBlock>;
  let mockedMintGuard: sinon.SinonStubbedInstance<MintGuard>;
  let settings: Settings;

  beforeEach(async () => {
    const container = new Container()

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedSignatureCollector = sinon.createStubInstance(SignatureCollector);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    mockedSortedMerkleTreeFactory = sinon.createStubInstance(SortedMerkleTreeFactory);
    mockedSaveMintedBlock = sinon.createStubInstance(SaveMintedBlock);
    mockedMintGuard = sinon.createStubInstance(MintGuard);
    settings = {
      feedsFile: 'src/config/feeds.yaml',
      feedsOnChain: 'src/config/feedsOnChain.yaml',
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(SignatureCollector).toConstantValue(mockedSignatureCollector as unknown as SignatureCollector);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor  as unknown as FeedProcessor);
    container.bind(SortedMerkleTreeFactory).toConstantValue(mockedSortedMerkleTreeFactory);
    container.bind(SaveMintedBlock).toConstantValue(mockedSaveMintedBlock as unknown as SaveMintedBlock);
    container.bind(MintGuard).toConstantValue(mockedMintGuard as unknown as MintGuard);
    container.bind('Settings').toConstantValue(settings);

    container.bind(BlockMinter).to(BlockMinter)
  })

  describe('#sortLeaves', () => {
    it('sorts leaves based on leaf\'s label', async () => {
      const leaves: Leaf[] = [
        { label: 'b', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0' },
        { label: 'a', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0' },
        { label: 'd', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0' },
        { label: 'c', _id: '1', timestamp: new Date(), blockHeight: 1, valueBytes: '0x0' },
      ]
      const resultingLeaves = BlockMinter.sortLeaves(leaves)

      resultingLeaves.forEach((leaf, i) => {
        if (i === 0) {
          return
        }

        expect(leaf.label >= resultingLeaves[i - 1].label).to.be.eq(true, 'not sorted')
      })
    })
  })

  describe('#generateAffidavit', () => {
    it('generates affidavit successfully', () => {
      const affidavit = BlockMinter.generateAffidavit(
        ethers.utils.keccak256('0x1234'),
        BigNumber.from(1),
        ['ETH-USD'],
        [100],
      );

      expect(affidavit).to.be.a('string').that.matches(/^0x[0-9a-fA-F]{64}$/, 'generated affidavit is not a valid hex string');
    })
  })

  describe('#signAffidavitWithWallet', () => {
    it('signes affidavit successfully', async () => {
      const { affidavit } = leafWithAffidavit
      const wallet = Wallet.createRandom();
      const signedAffidavit = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      expect(signedAffidavit).to.be.a('string').that.matches(/^0x[0-9a-fA-F]+$/, 'generated affidavit is not a valid hex string');
    })
  })

  describe('#recoverSigner', () => {
    it('recovers signer\'s address', async () => {
      const { affidavit } = leafWithAffidavit
      const wallet = Wallet.createRandom();
      const signedAffidavit = await BlockMinter.signAffidavitWithWallet(wallet, affidavit);

      const signersAddress = BlockMinter.recoverSigner(affidavit, signedAffidavit);

      expect(signersAddress).to.be.eq(wallet.address)
    })
  })
})
