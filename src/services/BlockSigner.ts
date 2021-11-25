import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';
import {SignedBlock} from '../types/SignedBlock';
import {BlockSignerResponse} from '../types/BlockSignerResponse';
import BlockRepository from './BlockRepository';

import {chainReadyForNewBlock, signAffidavitWithWallet} from '../utils/mining';
import {ProposedConsensus} from '../types/Consensus';
import {ChainStatus} from '../types/ChainStatus';
import {DiscrepancyFinder} from './DiscrepancyFinder';
import newrelic from 'newrelic';
import {Discrepancy} from '../types/Discrepancy';
import {ProposedConsensusService} from './ProposedConsensusService';
import {FeedDataService} from './FeedDataService';

@injectable()
class BlockSigner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(FeedDataService) feedDataService!: FeedDataService;

  async apply(block: SignedBlock): Promise<BlockSignerResponse> {
    const {proposedConsensus, chainAddress, chainStatus} = await this.executeRequireChecks(block);

    this.logger.info(
      `Request from ${proposedConsensus.signer} to sign a block ~${chainStatus.nextBlockId} with ${proposedConsensus.leaves.length} leaves and ${proposedConsensus.fcdKeys.length} FCDs`,
    );

    const {firstClassLeaves, leaves, fcdsFeeds, leavesFeeds} = await this.feedDataService.getLeavesAndFeeds(
      proposedConsensus.dataTimestamp,
    );

    const discrepancies = DiscrepancyFinder.apply(proposedConsensus, firstClassLeaves, leaves, fcdsFeeds, leavesFeeds);

    if (discrepancies.length) {
      await this.reportDiscrepancies(discrepancies);
      return {discrepancies, signature: '', version: this.settings.version};
    }

    const signature = await signAffidavitWithWallet(this.blockchain.wallet, proposedConsensus.affidavit);

    const signedBlockConsensus = {
      dataTimestamp: block.dataTimestamp,
      leaves: proposedConsensus.leaves,
      root: proposedConsensus.root,
      fcdKeys: proposedConsensus.fcdKeys,
    };

    await this.blockRepository.saveBlock(chainAddress, signedBlockConsensus, chainStatus.lastBlockId + 1);

    this.logger.info(`Signed a block for ${proposedConsensus.signer} at ${block.dataTimestamp}`);

    return {signature, discrepancies, version: this.settings.version};
  }

  private async reportDiscrepancies(discrepancies: Discrepancy[]): Promise<void> {
    discrepancies.map((d) => {
      const discrepancy: Discrepancy = {key: d.key, discrepancy: Math.round(d.discrepancy * 100) / 100.0};
      newrelic.recordCustomEvent('PriceDiscrepancy', {...discrepancy});
    });
  }

  async executeRequireChecks(
    block: SignedBlock,
  ): Promise<{proposedConsensus: ProposedConsensus; chainAddress: string; chainStatus: ChainStatus}> {
    const [chainAddress, chainStatus] = await this.chainContract.resolveStatus();
    const [ready, error] = chainReadyForNewBlock(chainStatus, block.dataTimestamp);

    if (!ready) {
      throw Error(error);
    }

    this.logger.info(`Signing a block for ${chainStatus.nextLeader} at ${block.dataTimestamp}...`);

    const proposedConsensus = ProposedConsensusService.apply(block);

    if (this.blockchain.wallet.address === proposedConsensus.signer) {
      throw Error('You should not call yourself for signature.');
    }

    if (proposedConsensus.signer !== chainStatus.nextLeader) {
      throw Error(
        `Signature does not belong to the current leader, expected ${chainStatus.nextLeader} got ${proposedConsensus.signer} at block ${chainStatus.blockNumber}/${chainStatus.nextBlockId}`,
      );
    }

    return {proposedConsensus, chainAddress, chainStatus};
  }
}

export default BlockSigner;
