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

  it('return empty array when no discrepancy', () => {
    const discrepancies = DiscrepancyFinder.apply(
      proposedConsensus,
      proposedConsensus.fcds,
      proposedConsensus.leaves,
      feeds,
      feeds,
    );

    expect(discrepancies.length).to.eq(0);
  });

  describe('return discrepancy', () => {
    it('when all our data are different', () => {
      const myLeaves = proposedConsensus.fcds.map((fcd) => {
        return {
          label: fcd.label,
          valueBytes: '0x6b211212a1234567234567234567234567234567234567234567234567234567',
        };
      });

      const discrepancies = DiscrepancyFinder.apply(proposedConsensus, [], myLeaves, feeds, feeds);

      expect(discrepancies.length).to.eq(2);
      expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 0.24});
      expect(discrepancies[1]).to.eql({key: leaf.label, discrepancy: 100});
    });

    it('when we missing fcds', () => {
      const myFcds = proposedConsensus.fcds.map((fcd) => {
        return {
          label: fcd.label + '-DIFFERENT',
          valueBytes: fcd.valueBytes,
        };
      });

      const discrepancies = DiscrepancyFinder.apply(proposedConsensus, myFcds, proposedConsensus.leaves, feeds, feeds);

      expect(discrepancies.length).to.eq(1);
      expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
    });

    it('when we missing leaves', () => {
      const myFcds = proposedConsensus.fcds.map((fcd) => {
        return {
          label: fcd.label + '-DIFFERENT',
          valueBytes: fcd.valueBytes,
        };
      });

      const discrepancies = DiscrepancyFinder.apply(proposedConsensus, proposedConsensus.fcds, myFcds, feeds, feeds);

      expect(discrepancies.length).to.eq(1);
      expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
    });

    it('when we have no data', () => {
      const discrepancies = DiscrepancyFinder.apply(proposedConsensus, [], [], feeds, feeds);

      expect(discrepancies.length).to.eq(2);
      expect(discrepancies[0]).to.eql({key: leaf.label, discrepancy: 100});
      expect(discrepancies[1]).to.eql({key: leaf.label, discrepancy: 100});
    });
  });
});
