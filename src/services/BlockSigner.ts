import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {KeyValues, SignedBlock} from '../types/SignedBlock';
import Blockchain from '../lib/Blockchain';
import ChainContract from '../contracts/ChainContract';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import Leaf from '../models/Leaf';
import {BigNumber} from 'ethers';
import loadFeeds from '../config/loadFeeds';
import FeedProcessor from './FeedProcessor';
import Feeds from '../types/Feed';
import {Logger} from 'winston';
import BlockMinter from './BlockMinter';
import {LeafType, LeafValueCoder} from '@umb-network/toolbox';
import sort from 'fast-sort';
import StatsDClient from '../lib/StatsDClient';

@injectable()
class BlockSigner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(block: SignedBlock): Promise<string> {
    const {leader, blockHeight} = await this.chainContract.getLatestData();

    if (leader === this.blockchain.wallet.address) {
      throw Error('You are the leader, and you should not sign your block again.');
    }

    if (block.blockHeight !== blockHeight.toNumber()) {
      throw Error(`Does not match with the current block ${blockHeight}.`);
    }

    this.logger.info(`Signing a block for ${leader} at ${block.timestamp}...`);

    const proposedLeaves = this.keyValuesToLeaves(block.leaves);
    const proposedTree = this.sortedMerkleTreeFactory.apply(BlockMinter.sortLeaves(proposedLeaves));

    const proposedFcd = BlockMinter.sortLeaves(this.keyValuesToLeaves(block.fcd));
    const proposedFcdKeys: string[] = proposedFcd.map(({label}) => label);
    const proposedFcdValues: number[] = proposedFcd.map(({valueBytes}) => LeafValueCoder.decode(valueBytes) as number);

    const affidavit = BlockMinter.generateAffidavit(
      proposedTree.getRoot(),
      BigNumber.from(block.blockHeight),
      proposedFcdKeys,
      proposedFcdValues,
    );
    const recoveredSigner = await BlockMinter.recoverSigner(affidavit, block.signature);
    if (recoveredSigner !== leader) {
      throw Error('Signature does not belong to the current leader');
    }

    let discrepancies;
    try {
      discrepancies = await this.checkFeeds(
        block.timestamp,
        [this.settings.feedsOnChain, this.settings.feedsFile],
        [proposedFcd, proposedLeaves],
      );
    } catch (err) {
      console.error(err);
      throw err;
    }

    if (discrepancies) {
      throw Error(`Discrepancy is to high: [${discrepancies}]`);
    }

    const result = await BlockMinter.signAffidavitWithWallet(this.blockchain.wallet, affidavit);

    this.logger.info(`Signed a block for ${leader} at ${block.timestamp}`);

    return result;
  }

  private async checkFeeds(
    timestamp: number,
    feedFiles: string[],
    proposedLeaves: Leaf[][],
  ): Promise<string | undefined> {
    const feeds: Feeds[] = await Promise.all(feedFiles.map((fileName) => loadFeeds(fileName)));

    const leaves = await this.feedProcessor.apply(timestamp, ...feeds);

    for (let i = 0; i < feeds.length; ++i) {
      const discrepancies = Object.entries(this.findDiscrepancies(leaves[i], proposedLeaves[i], feeds[i]));

      if (discrepancies.length) {
        return sort(discrepancies)
          .desc(([, value]) => value)
          .map(([key, value]) => {
            const discrepancy = Math.round(value * 100) / 100.0;
            StatsDClient?.set(`discrepancy.${key}`, discrepancy);
            return `${key}: ${discrepancy}%`;
          })
          .join(', ');
      }
    }
  }

  private findDiscrepancies(leaves: Leaf[], proposedLeaves: Leaf[], feeds: Feeds) {
    const leafByLabel: {[label: string]: Leaf} = {};
    leaves.forEach((leaf) => {
      leafByLabel[leaf.label] = leaf;
    });

    const discrepancies: {[key: string]: number} = {};

    proposedLeaves.forEach(({valueBytes: proposedValueBytes, label}) => {
      const leaf = leafByLabel[label];
      if (!leaf) {
        discrepancies[label] = 100;
        return;
      }

      const proposedValue = LeafValueCoder.decode(proposedValueBytes) as number;
      const value = LeafValueCoder.decode(leaf.valueBytes) as number;
      const {discrepancy} = feeds[leaf.label];

      const diffPerc = (200 * Math.abs(value - proposedValue)) / (value + proposedValue);

      if (discrepancy < diffPerc) {
        discrepancies[label] = diffPerc;
      }

      this.logger.debug(`${leaf}: proposed = ${proposedValue}, value = ${value}, discrepancy = ${diffPerc}`);
    });

    return discrepancies;
  }

  private keyValuesToLeaves(keyValues: KeyValues): Leaf[] {
    return Object.entries(keyValues).map(
      ([label, value]): Leaf => {
        const leaf = new Leaf();
        leaf.valueBytes = '0x' + LeafValueCoder.encode(value, LeafType.TYPE_FLOAT).toString('hex');
        leaf.label = label;

        return leaf;
      },
    );
  }
}

export default BlockSigner;
