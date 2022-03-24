import 'reflect-metadata';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';

import Feeds from '../../src/types/Feed';
import {DiscrepancyFinder} from '../../src/services/DiscrepancyFinder';
import {Wallet} from 'ethers';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {signAffidavitWithWallet} from '../../src/utils/mining';
import {ProposedConsensusService} from '../../src/services/ProposedConsensusService';
import {SignedBlock} from '../../src/types/SignedBlock';
import {ProposedConsensus} from '../../src/types/Consensus';

chai.use(chaiAsPromised);

describe('DiscrepancyFinder', () => {
  const {affidavit, leaf, fcd, timestamp} = leafWithAffidavit;
  const wallet = Wallet.createRandom();
  let signature;
  let block: SignedBlock;
  let proposedConsensus: ProposedConsensus;

  const feeds: Feeds = {};
  feeds[leaf.label] = {
    discrepancy: 0.1,
    inputs: [],
    precision: 2,
  };

  before(async () => {
    signature = await signAffidavitWithWallet(wallet, affidavit);

    block = {
      dataTimestamp: timestamp,
      fcd: fcd,
      leaves: fcd,
      signature,
    };

    proposedConsensus = ProposedConsensusService.apply(block);
  });

  it('returns 2 arrays of FCD and L2D discrepancies', () => {
    const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(proposedConsensus, [], [], feeds, feeds);

    expect(fcdDiscrepancies).to.be.an('array');
    expect(l2dDiscrepancies).to.be.an('array');
  });

  describe('when there are no discrepancies', () => {
    it('returns no discrepancies for FCD and L2D', () => {
      const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(
        proposedConsensus,
        proposedConsensus.fcds,
        proposedConsensus.leaves,
        feeds,
        feeds,
      );

      const discrepancies = fcdDiscrepancies.concat(l2dDiscrepancies);

      expect(discrepancies.length).to.eq(0);
    });
  });

  describe('when there are discrepancies', () => {
    it('returns FCD and L2D discrepancies', () => {
      const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(proposedConsensus, [], [], feeds, feeds);

      expect(fcdDiscrepancies).to.have.lengthOf(1);
      expect(l2dDiscrepancies).to.have.lengthOf(1);
    });

    describe('and FCD leaves are not provided', () => {
      it('returns the L2D discrepancies', () => {
        const myFcds = proposedConsensus.fcds.map((fcd) => {
          return {
            label: fcd.label + '-DIFFERENT',
            valueBytes: fcd.valueBytes,
          };
        });

        const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(
          proposedConsensus,
          myFcds,
          proposedConsensus.leaves,
          feeds,
          feeds,
        );

        const discrepancies = fcdDiscrepancies.concat(l2dDiscrepancies);

        expect(discrepancies.length).to.eq(1);
        expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
      });
    });

    describe('and L2D leaves are not provided', () => {
      it('returns the FCD discrepancies', () => {
        const myFcds = proposedConsensus.fcds.map((fcd) => {
          return {
            label: fcd.label + '-DIFFERENT',
            valueBytes: fcd.valueBytes,
          };
        });

        const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(
          proposedConsensus,
          proposedConsensus.fcds,
          myFcds,
          feeds,
          feeds,
        );

        const discrepancies = fcdDiscrepancies.concat(l2dDiscrepancies);

        expect(discrepancies.length).to.eq(1);
        expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
      });
    });

    describe('and all of our data is different', () => {
      it('returns full discrepancies for FCD and L2D', () => {
        const myLeaves = proposedConsensus.fcds.map((fcd) => {
          return {
            label: fcd.label,
            valueBytes: '0x6b211212a1234567234567234567234567234567234567234567234567234567',
          };
        });

        const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(
          proposedConsensus,
          [],
          myLeaves,
          feeds,
          feeds,
        );

        const discrepancies = fcdDiscrepancies.concat(l2dDiscrepancies);

        expect(discrepancies.length).to.eq(2);
        expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
        expect(discrepancies[1]).to.eql({key: leaf.label, discrepancy: 0.24});
      });
    });

    describe('and no leaves are not provided', () => {
      it('returns full discrepancies for FCD and L2D', () => {
        const [fcdDiscrepancies, l2dDiscrepancies] = DiscrepancyFinder.apply(proposedConsensus, [], [], feeds, feeds);

        const discrepancies = fcdDiscrepancies.concat(l2dDiscrepancies);

        expect(discrepancies.length).to.eq(2);
        expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
        expect(discrepancies[1]).to.eql({key: leaf.label, discrepancy: 100});
      });
    });
  });
});
