import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import SortedMerkleTreeFactory from './SortedMerkleTreeFactory.js';
import Settings from '../types/Settings.js';
import {SignedBlock} from '../types/SignedBlock.js';
import {BlockSignerResponse} from '../types/BlockSignerResponse.js';
import BlockRepository from '../repositories/BlockRepository.js';

import {signAffidavitWithWallet} from '../utils/mining.js';
import {LeavesAndFeeds, ProposedConsensus} from '../types/Consensus.js';
import {DiscrepancyFinder} from './DiscrepancyFinder.js';
import {ProposedConsensusFactory} from '../factories/ProposedConsensusFactory.js';
import {FeedDataService} from './FeedDataService.js';
import {MultiChainStatusResolver} from './multiChain/MultiChainStatusResolver.js';
import {FeedsType} from '../types/Feed.js';
import {Wallet} from 'ethers';

@injectable()
class BlockSigner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(MultiChainStatusResolver) multiChainStatusResolver!: MultiChainStatusResolver;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(FeedDataService) feedDataService!: FeedDataService;

  async apply(block: SignedBlock): Promise<BlockSignerResponse> {
    const {proposedConsensus, chainAddress} = await this.check(block);

    this.logger.info(
      [
        `[BlockSigner] Request from ${proposedConsensus.signer} to sign a block ${proposedConsensus.dataTimestamp}`,
        `with ${proposedConsensus.leaves.length} leaves and ${proposedConsensus.fcdKeys.length} FCDs`,
      ].join(' '),
    );

    const requestedFeeds = [...proposedConsensus.fcdKeys, ...proposedConsensus.leaves.map((leaf) => leaf.label)];

    const resolvedFeeds = await this.feedDataService.apply(
      proposedConsensus.dataTimestamp,
      FeedsType.CONSENSUS,
      requestedFeeds,
    );

    const {firstClassLeaves, leaves, fcdsFeeds, leavesFeeds} = resolvedFeeds.feeds as LeavesAndFeeds;

    const discrepancies = DiscrepancyFinder.apply({
      proposedFcds: proposedConsensus.fcds,
      proposedLeaves: proposedConsensus.leaves,
      fcds: firstClassLeaves,
      leaves,
      fcdsFeeds,
      leavesFeeds,
    });

    if (discrepancies.length) {
      this.logger.warn(`[BlockSigner] Cannot sign block. Discrepancies found: ${discrepancies.length}`);
      this.logger.debug(`[BlockSigner] Discrepancies: ${JSON.stringify(discrepancies)}`);
      return {discrepancies, signature: '', version: this.settings.version};
    }

    const signature = await signAffidavitWithWallet(this.signingWallet(), proposedConsensus.affidavit);

    const signedBlockConsensus = {
      dataTimestamp: block.dataTimestamp,
      leaves: proposedConsensus.leaves,
      root: proposedConsensus.root,
      fcdKeys: proposedConsensus.fcdKeys,
    };

    await this.blockRepository.saveBlock(chainAddress, signedBlockConsensus);
    this.logger.info(`[BlockSigner] Signed a block for ${proposedConsensus.signer} at ${block.dataTimestamp}`);
    this.logger.debug(`[BlockSigner] Signature: ${signature}`);
    return {signature, discrepancies, version: this.settings.version};
  }

  async check(block: SignedBlock): Promise<{proposedConsensus: ProposedConsensus; chainAddress: string}> {
    const proposedConsensus = ProposedConsensusFactory.apply(block);

    const {chainsStatuses, nextLeader, chainsIdsReadyForBlock} = await this.multiChainStatusResolver.apply(
      proposedConsensus.dataTimestamp,
    );

    if (chainsStatuses.length === 0) {
      throw Error('[BlockSigner] No chain status resolved.');
    }

    const {chainAddress, chainStatus} = chainsStatuses[0];
    this.logger.info(
      `[BlockSigner] Signing a block for ${nextLeader.location} (${nextLeader.id}) at ${block.dataTimestamp}...`,
    );

    if (this.signingWallet().address.toLowerCase() === proposedConsensus.signer.toLowerCase()) {
      throw Error('[BlockSigner] You should not call yourself for signature.');
    }

    if (proposedConsensus.signer.toLowerCase() !== nextLeader.id.toLowerCase()) {
      throw Error(
        [
          'Signature does not belong to the current leader,',
          `expected ${nextLeader} got ${proposedConsensus.signer}`,
          `at block ${chainStatus.blockNumber}/${chainStatus.nextBlockId}`,
        ].join(' '),
      );
    }

    if (chainsIdsReadyForBlock.length === 0) {
      throw Error(`[BlockSigner] None of the chains is ready for data at ${proposedConsensus.dataTimestamp}`);
    }

    return {proposedConsensus, chainAddress};
  }

  protected signingWallet(): Wallet {
    return new Wallet(this.settings.blockchain.wallets.evm.privateKey);
  }
}

export default BlockSigner;
