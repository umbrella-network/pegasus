import 'reflect-metadata';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {Wallet} from 'ethers';

import BlockSigner from '../../src/services/BlockSigner';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from '../../src/services/FeedProcessor';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {signAffidavitWithWallet, timestamp} from '../../src/utils/mining';
import {getTestContainer} from '../helpers/getTestContainer';
import BlockRepository from '../../src/services/BlockRepository';
import {ConsensusDataService} from '../../src/services/consensus/ConsensusDataService';
import {leavesAndFeedsFactory} from '../mocks/factories/leavesAndFeedsFactory';
import {chainStatusFactory} from '../mocks/factories/chainStatusFactory';

chai.use(chaiAsPromised);

describe('BlockSigner', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedFeedDataService: sinon.SinonStubbedInstance<ConsensusDataService>;
  let mockedBlockRepository: sinon.SinonStubbedInstance<BlockRepository>;

  let blockSigner: BlockSigner;

  before(async () => {
    const container = getTestContainer();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    mockedFeedDataService = sinon.createStubInstance(ConsensusDataService);
    mockedBlockRepository = sinon.createStubInstance(BlockRepository);

    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(BlockRepository).toConstantValue(mockedBlockRepository);
    container.bind(ConsensusDataService).toConstantValue(mockedFeedDataService);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor as unknown as FeedProcessor);
    container.bind(BlockSigner).to(BlockSigner);

    blockSigner = container.get(BlockSigner);
  });

  after(() => {
    sinon.restore();
  });

  describe('when chain is not ready', () => {
    it('throws an error', async () => {
      mockedBlockchain.wallet = Wallet.createRandom();
      const nextLeader = Wallet.createRandom();
      const signature = await signAffidavitWithWallet(
        nextLeader,
        '0x631a4e7c2311787c7da16377b77f24bdd12a293dd7956789f1b5c6b16fe1e262',
      );

      mockedChainContract.resolveStatus.resolves([
        '0x123',
        chainStatusFactory.build({
          nextLeader: nextLeader.address,
          validators: [Wallet.createRandom().address],
          lastDataTimestamp: timestamp(),
        }),
      ]);

      await expect(
        blockSigner.apply({
          dataTimestamp: 10,
          fcd: {'ETH-USD': '0xABCD'},
          leaves: {'ETH-USD': '0xABCD'},
          signature,
        }),
      ).to.be.rejectedWith('skipping 1: waiting for next round');
    });
  });

  describe('when signatures does not match', () => {
    it('throws an error', async () => {
      const {affidavit, fcd, timestamp} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signature = await signAffidavitWithWallet(wallet, affidavit);
      const nextLeader = Wallet.createRandom().address;

      mockedBlockchain.wallet = Wallet.createRandom();
      mockedChainContract.resolveStatus.resolves([
        '0x123',
        chainStatusFactory.build({nextLeader: nextLeader, validators: [wallet.address]}),
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
  });

  describe('when validator calls itself', () => {
    it('throws an error', async () => {
      const {affidavit, fcd, timestamp} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signature = await signAffidavitWithWallet(wallet, affidavit);
      mockedBlockchain.wallet = wallet;

      mockedChainContract.resolveStatus.resolves([
        '0x123',
        chainStatusFactory.build({nextLeader: wallet.address, validators: [wallet.address]}),
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
  });

  describe('when chain is ready with correct validators', () => {
    describe('when there are discrepancies', () => {
      it('returns discrepancies', async () => {
        const {affidavit, fcd, leaf, timestamp} = leafWithAffidavit;
        const leaderWallet = Wallet.createRandom();
        const wallet = Wallet.createRandom();
        const signature = await signAffidavitWithWallet(leaderWallet, affidavit);
        mockedBlockchain.wallet = wallet;

        mockedChainContract.resolveStatus.resolves([
          '0x123',
          chainStatusFactory.build({nextLeader: leaderWallet.address, validators: [wallet.address]}),
        ]);

        mockedFeedDataService.getLeavesAndFeeds.resolves(
          leavesAndFeedsFactory.build({
            leaves: [
              {
                label: 'ETH-USD',
                valueBytes: '0x6b62c4f82b00e1c6c32769ee6b4ce38656687919c0145',
              },
            ],
          }),
        );

        mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

        const result = await blockSigner.apply({
          dataTimestamp: timestamp,
          fcd,
          leaves: fcd,
          signature,
        });

        expect(mockedBlockRepository.saveBlock.called).to.be.false;
        expect(result.discrepancies).to.deep.include({key: 'ETH-USD', discrepancy: 200});
      });
    });

    describe('when there are no discrepancies', () => {
      it("returns validator's signature and saves the block", async () => {
        const hexadecimalPattern = /^0x[0-9a-fA-F]+$/;
        const {affidavit, fcd, leaf, timestamp} = leafWithAffidavit;
        const leaderWallet = Wallet.createRandom();
        const wallet = Wallet.createRandom();
        const signature = await signAffidavitWithWallet(leaderWallet, affidavit);
        mockedBlockchain.wallet = wallet;

        mockedChainContract.resolveStatus.resolves([
          '0x123',
          chainStatusFactory.build({nextLeader: leaderWallet.address, validators: [wallet.address]}),
        ]);

        mockedFeedDataService.getLeavesAndFeeds.resolves(leavesAndFeedsFactory.build());

        mockedFeedProcessor.apply.resolves([[leaf], [leaf]]);

        const result = await blockSigner.apply({
          dataTimestamp: timestamp,
          fcd,
          leaves: fcd,
          signature,
        });

        expect(mockedBlockRepository.saveBlock.called).to.be.true;
        expect(result.signature).to.be.a('string').that.matches(hexadecimalPattern);
      });
    });
  });
});
