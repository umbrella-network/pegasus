import {inject, injectable} from 'inversify';
import newrelic from 'newrelic';
import sort from 'fast-sort';
import {Logger} from 'winston';
import {LeafValueCoder} from '@umb-network/toolbox';

import FeedProcessor from './FeedProcessor';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import loadFeeds from '../config/loadFeeds';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../models/Leaf';
import {Discrepancy} from '../types/Discrepancy';
import Feeds from '../types/Feed';
import Settings from '../types/Settings';
import {KeyValues, SignedBlock} from '../types/SignedBlock';
import {BlockSignerResponse} from '../types/BlockSignerResponse';
import {ethers} from 'ethers';

import {chainReadyForNewBlock, generateAffidavit, signAffidavitWithWallet, sortLeaves} from '../utils/mining';
import {calcDiscrepancy} from '../utils/math';

@injectable()
class BlockSigner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(block: SignedBlock): Promise<BlockSignerResponse> {
    const [, chainStatus] = await this.chainContract.resolveStatus();

    const [ready, error] = chainReadyForNewBlock(chainStatus, block.dataTimestamp);

    if (!ready) {
      throw Error(error);
    }

    this.logger.info(`Signing a block for ${chainStatus.nextLeader} at ${block.dataTimestamp}...`);

    const proposedLeaves = BlockSigner.keyValuesToLeaves(block.leaves);
    const proposedTree = this.sortedMerkleTreeFactory.apply(sortLeaves(proposedLeaves));

    const proposedFcd = sortLeaves(BlockSigner.keyValuesToLeaves(block.fcd));
    const proposedFcdKeys: string[] = proposedFcd.map(({label}) => label);
    const proposedFcdValues: number[] = proposedFcd.map(({valueBytes}) => LeafValueCoder.decode(valueBytes));

    const affidavit = generateAffidavit(
      block.dataTimestamp,
      proposedTree.getRoot(),
      proposedFcdKeys,
      proposedFcdValues,
    );

    const recoveredSigner = await BlockSigner.recoverSigner(affidavit, block.signature);

    if (this.blockchain.wallet.address === recoveredSigner) {
      throw Error('You should not call yourself for signature.');
    }

    if (recoveredSigner !== chainStatus.nextLeader) {
      throw Error(
        `Signature does not belong to the current leader, expected ${chainStatus.nextLeader} got ${recoveredSigner} at block ${chainStatus.blockNumber}/${chainStatus.nextBlockId}`,
      );
    }

    let discrepancies;
    try {
      discrepancies = await this.checkFeeds(
        block.dataTimestamp,
        [this.settings.feedsOnChain, this.settings.feedsFile],
        [proposedFcd, proposedLeaves],
      );
    } catch (err) {
      console.error(err);
      throw err;
    }

    if (discrepancies.length) {
      return {discrepancies, signature: '', version: this.settings.version};
    }

    const signature = await signAffidavitWithWallet(this.blockchain.wallet, affidavit);

    this.logger.info(`Signed a block for ${recoveredSigner} at ${block.dataTimestamp}`);

    return {signature: signature, discrepancies: [], version: this.settings.version};
  }

  static recoverSigner(affidavit: string, signature: string): string {
    const pubKey = ethers.utils.recoverPublicKey(
      ethers.utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', ethers.utils.arrayify(affidavit)],
      ),
      signature,
    );

    return ethers.utils.computeAddress(pubKey);
  }

  private async checkFeeds(timestamp: number, feedFiles: string[], proposedLeaves: Leaf[][]): Promise<Discrepancy[]> {
    const feeds: Feeds[] = await Promise.all(feedFiles.map((fileName) => loadFeeds(fileName)));

    const leaves = await this.feedProcessor.apply(timestamp, ...feeds);

    const discrepancies = new Map<string, number>();

    for (let i = 0; i < feeds.length; ++i) {
      if (!leaves[i].length) {
        throw new Error(`feedProcessor[${i}] returned no leaves`);
      }

      Object.entries(BlockSigner.findDiscrepancies(leaves[i], proposedLeaves[i], feeds[i])).forEach(([key, value]) =>
        discrepancies.set(key, value),
      );
    }

    return sort([...discrepancies.entries()])
      .desc(([, value]) => value)
      .map(([key, value]) => {
        const discrepancy: Discrepancy = {key, discrepancy: Math.round(value * 100) / 100.0};
        newrelic.recordCustomEvent('PriceDiscrepancy', {...discrepancy});
        return discrepancy;
      });
  }

  private static findDiscrepancies(leaves: Leaf[], proposedLeaves: Leaf[], feeds: Feeds): Map<string, number> {
    const leafByLabel: {[label: string]: Leaf} = {};

    leaves.forEach((leaf) => {
      leafByLabel[leaf.label] = leaf;
    });

    const discrepancies: Map<string, number> = new Map();

    proposedLeaves.forEach(({valueBytes: proposedValueBytes, label}) => {
      const leaf = leafByLabel[label];
      if (!leaf) {
        // cannot agree on the value that we don't have
        discrepancies.set(label, 100);
        return;
      }

      const proposedValue = LeafValueCoder.decode(proposedValueBytes);
      const value = LeafValueCoder.decode(leaf.valueBytes);
      const {discrepancy} = feeds[leaf.label];

      const diffPerc = calcDiscrepancy(value, proposedValue) * 100.0;

      if (discrepancy < diffPerc) {
        discrepancies.set(label, diffPerc);
      }
    });

    return discrepancies;
  }

  private static keyValuesToLeaves(keyValues: KeyValues): Leaf[] {
    return Object.entries(keyValues).map(([label, value]): Leaf => BlockSigner.newLeaf(label, value));
  }

  private static newLeaf(label: string, value: number): Leaf {
    const leaf = new Leaf();
    leaf.valueBytes = '0x' + LeafValueCoder.encode(value).toString('hex');
    leaf.label = label;

    return leaf;
  }
}

export default BlockSigner;
