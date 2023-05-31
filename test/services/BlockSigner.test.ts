import 'reflect-metadata';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {BigNumber, Wallet} from 'ethers';

import BlockSigner from '../../src/services/BlockSigner';
import Blockchain from '../../src/lib/Blockchain';
import ChainContract from '../../src/contracts/ChainContract';
import FeedProcessor from '../../src/services/FeedProcessor';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {signAffidavitWithWallet} from '../../src/utils/mining';
import {getTestContainer} from '../helpers/getTestContainer';
import BlockRepository from '../../src/repositories/BlockRepository';
import {FeedDataService} from '../../src/services/FeedDataService';
import {leavesAndFeedsFactory} from '../mocks/factories/leavesAndFeedsFactory';
import {chainStatusFactory} from '../mocks/factories/chainStatusFactory';
import {MultiChainStatusResolver} from '../../src/services/multiChain/MultiChainStatusResolver';
import {ChainsStatuses} from '../../src/types/ChainStatus';

chai.use(chaiAsPromised);

const allStates: ChainsStatuses = {
  validators: [
    {id: '0xabctest', power: BigNumber.from(1), location: ''},
    {id: '0xdeftest', power: BigNumber.from(1), location: ''},
  ],
  nextLeader: '0x998cb7821e605cC16b6174e7C50E19ADb2Dd2fB0',
  chainsStatuses: [],
  chainsIdsReadyForBlock: [],
};

const timePadding = 10;

describe('BlockSigner', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedChainContract: sinon.SinonStubbedInstance<ChainContract>;
  let mockedFeedProcessor: sinon.SinonStubbedInstance<FeedProcessor>;
  let mockedFeedDataService: sinon.SinonStubbedInstance<FeedDataService>;
  let mockedBlockRepository: sinon.SinonStubbedInstance<BlockRepository>;
  let mockedMultiChainStatusResolver: sinon.SinonStubbedInstance<MultiChainStatusResolver>;
  let blockSigner: BlockSigner;

  before(async () => {
    const container = getTestContainer();

    mockedBlockchain = sinon.createStubInstance(Blockchain);
    mockedChainContract = sinon.createStubInstance(ChainContract);
    mockedFeedProcessor = sinon.createStubInstance(FeedProcessor);
    mockedFeedDataService = sinon.createStubInstance(FeedDataService);
    mockedBlockRepository = sinon.createStubInstance(BlockRepository);
    mockedMultiChainStatusResolver = sinon.createStubInstance(MultiChainStatusResolver);

    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(BlockRepository).toConstantValue(mockedBlockRepository);
    container.bind(FeedDataService).toConstantValue(mockedFeedDataService);
    container.bind(ChainContract).toConstantValue(mockedChainContract);
    container.bind(MultiChainStatusResolver).toConstantValue(mockedMultiChainStatusResolver);
    container.bind(FeedProcessor).toConstantValue(mockedFeedProcessor as unknown as FeedProcessor);
    container.bind(BlockSigner).to(BlockSigner);

    blockSigner = container.get(BlockSigner);
  });

  after(() => {
    sinon.restore();
  });

  describe('when no chain is ready', () => {
    it('throws an error', async () => {
      const {affidavit, fcd, timestamp} = leafWithAffidavit;
      const leaderWallet = Wallet.createRandom();
      const wallet = Wallet.createRandom();
      const signature = await signAffidavitWithWallet(leaderWallet, affidavit);
      mockedBlockchain.wallet = wallet;

      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: chainStatusFactory.build({validators: [leaderWallet.address]}),
          chainId: 'bsc',
        },
      ];

      allStates.nextLeader = leaderWallet.address;

      mockedMultiChainStatusResolver.apply.resolves(allStates);

      await expect(
        blockSigner.apply({
          dataTimestamp: timestamp,
          fcd: fcd,
          leaves: fcd,
          signature: signature,
        }),
      ).to.be.rejectedWith(`[BlockSigner] None of the chains is ready for data at ${timestamp}`);
    });
  });

  describe('when signatures does not match', () => {
    it('throws an error', async () => {
      const {affidavit, fcd, timestamp} = leafWithAffidavit;
      const wallet = Wallet.createRandom();
      const signature = await signAffidavitWithWallet(wallet, affidavit);
      const nextLeader = Wallet.createRandom().address;

      mockedBlockchain.wallet = Wallet.createRandom();

      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: chainStatusFactory.build({
            timePadding,
            validators: [nextLeader, wallet.address],
            lastDataTimestamp: timestamp - timePadding,
          }),
          chainId: 'bsc',
        },
      ];

      allStates.nextLeader = nextLeader;
      allStates.chainsIdsReadyForBlock = ['bsc'];
      mockedMultiChainStatusResolver.apply.resolves(allStates);

      await expect(
        blockSigner.apply({
          dataTimestamp: timestamp,
          fcd,
          leaves: fcd,
          signature,
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

      allStates.chainsStatuses = [
        {
          chainAddress: '0x123',
          chainStatus: chainStatusFactory.build({nextLeader: wallet.address, validators: [wallet.address]}),
          chainId: 'bsc',
        },
      ];

      allStates.chainsIdsReadyForBlock = ['bsc'];
      mockedMultiChainStatusResolver.apply.resolves(allStates);

      await expect(
        blockSigner.apply({
          dataTimestamp: timestamp,
          fcd: fcd,
          leaves: fcd,
          signature: signature,
        }),
      ).to.be.rejectedWith('[BlockSigner] You should not call yourself for signature.');
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

        allStates.chainsStatuses = [
          {
            chainAddress: '0x123',
            chainStatus: chainStatusFactory.build({
              timePadding,
              validators: [leaderWallet.address],
              lastDataTimestamp: timestamp - timePadding,
            }),
            chainId: 'bsc',
          },
        ];

        allStates.nextLeader = leaderWallet.address;
        allStates.chainsIdsReadyForBlock = ['bsc'];
        mockedMultiChainStatusResolver.apply.resolves(allStates);

        mockedFeedDataService.apply.resolves(
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

        allStates.chainsStatuses = [
          {
            chainAddress: '0x123',
            chainStatus: chainStatusFactory.build({validators: [leaderWallet.address]}),
            chainId: 'bsc',
          },
        ];

        allStates.nextLeader = leaderWallet.address;
        allStates.chainsIdsReadyForBlock = ['bsc'];
        mockedMultiChainStatusResolver.apply.resolves(allStates);

        mockedFeedDataService.apply.resolves(leavesAndFeedsFactory.build());

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
