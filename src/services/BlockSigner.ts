import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';
import {SignedBlock} from '../types/SignedBlock';
import {BlockSignerResponse} from '../types/BlockSignerResponse';
import BlockRepository from './BlockRepository';

import {signAffidavitWithWallet} from '../utils/mining';
import {ProposedConsensus} from '../types/Consensus';
import {DiscrepancyFinder} from './DiscrepancyFinder';
import newrelic from 'newrelic';
import {Discrepancy} from '../types/Discrepancy';
import {ProposedConsensusService} from './ProposedConsensusService';
import {MultiChainStatusResolver} from './multiChain/MultiChainStatusResolver';
import {ConsensusDataService} from './consensus/ConsensusDataService';

@injectable()
class BlockSigner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(MultiChainStatusResolver) multiChainStatusResolver!: MultiChainStatusResolver;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(ConsensusDataService) consensusDataService!: ConsensusDataService;

  async apply(block: SignedBlock): Promise<BlockSignerResponse> {
    await this.blockchain.setLatestProvider();
    const {proposedConsensus, chainAddress} = await this.check(block);

    this.logger.info(
      [
        `[BlockSigner] Request from ${proposedConsensus.signer} to sign a block ${proposedConsensus.dataTimestamp}`,
        `with ${proposedConsensus.leaves.length} leaves and ${proposedConsensus.fcdKeys.length} FCDs`,
      ].join(' '),
    );

    const {firstClassLeaves, leaves, fcdsFeeds, leavesFeeds} = await this.consensusDataService.getLeavesAndFeeds(
      proposedConsensus.dataTimestamp,
    );

    const discrepancies = DiscrepancyFinder.apply(proposedConsensus, firstClassLeaves, leaves, fcdsFeeds, leavesFeeds);

    if (discrepancies.length) {
      await this.reportDiscrepancies(discrepancies);
      this.logger.info(`[BlockSigner] Cannot sign block. Discrepancies found: ${discrepancies.length}`);
      this.logger.debug(`[BlockSigner] Discrepancies: ${JSON.stringify(discrepancies)}`);
      return {discrepancies, signature: '', version: this.settings.version};
    }

    const signature = await signAffidavitWithWallet(this.blockchain.wallet, proposedConsensus.affidavit);

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
    const proposedConsensus = ProposedConsensusService.apply(block);

    const {chainsStatuses, nextLeader, chainsIdsReadyForBlock} = await this.multiChainStatusResolver.apply(
      proposedConsensus.dataTimestamp,
    );

    if (chainsStatuses.length === 0) {
      throw Error('[BlockSigner] No chain status resolved.');
    }

    const {chainAddress, chainStatus} = chainsStatuses[0];
    this.logger.info(`[BlockSigner] Signing a block for ${nextLeader} at ${block.dataTimestamp}...`);

    if (this.blockchain.wallet.address === proposedConsensus.signer) {
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
}

export default BlockSigner;
