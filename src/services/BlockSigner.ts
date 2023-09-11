import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import Settings from '../types/Settings';
import {SignedBlock} from '../types/SignedBlock';
import {BlockSignerResponse} from '../types/BlockSignerResponse';
import BlockRepository from '../repositories/BlockRepository';

import {signAffidavitWithWallet} from '../utils/mining';
import {LeavesAndFeeds, ProposedConsensus} from '../types/Consensus';
import {DiscrepancyFinder} from './DiscrepancyFinder';
import newrelic from 'newrelic';
import {Discrepancy} from '../types/Discrepancy';
import {ProposedConsensusFactory} from '../factories/ProposedConsensusFactory';
import {FeedDataService} from './FeedDataService';
import {MultiChainStatusResolver} from './multiChain/MultiChainStatusResolver';
import {FeedsType} from '../types/Feed';
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

    const {firstClassLeaves, leaves, fcdsFeeds, leavesFeeds} = (await this.feedDataService.apply(
      proposedConsensus.dataTimestamp,
      FeedsType.CONSENSUS,
      requestedFeeds,
    )) as LeavesAndFeeds;

    const discrepancies = DiscrepancyFinder.apply({
      proposedFcds: proposedConsensus.fcds,
      proposedLeaves: proposedConsensus.leaves,
      fcds: firstClassLeaves,
      leaves,
      fcdsFeeds,
      leavesFeeds,
    });

    if (discrepancies.length) {
      await this.reportDiscrepancies(discrepancies);
      this.logger.info(`[BlockSigner] Cannot sign block. Discrepancies found: ${discrepancies.length}`);
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

  private async reportDiscrepancies(discrepancies: Discrepancy[]): Promise<void> {
    for (const d of discrepancies) {
      const discrepancy: Discrepancy = {key: d.key, discrepancy: Math.round(d.discrepancy * 100) / 100.0};
      newrelic.recordCustomEvent('PriceDiscrepancy', {...discrepancy});
    }
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
    this.logger.info(`[BlockSigner] Signing a block for ${nextLeader} at ${block.dataTimestamp}...`);

    if (this.signingWallet().address.toLowerCase() === proposedConsensus.signer.toLowerCase()) {
      throw Error('[BlockSigner] You should not call yourself for signature.');
    }

    if (proposedConsensus.signer.toLowerCase() !== nextLeader.toLowerCase()) {
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
