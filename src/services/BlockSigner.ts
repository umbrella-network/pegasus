import {inject, injectable} from 'inversify';
import newrelic from 'newrelic';
import sort from 'fast-sort';
import {Logger} from 'winston';
import {LeafType, LeafValueCoder} from '@umb-network/toolbox';

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
import {generateAffidavit, signAffidavitWithWallet, sortLeaves} from '../utils/mining';

@injectable()
class BlockSigner {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;

  async apply(block: SignedBlock): Promise<BlockSignerResponse> {
    const chainStatus = await this.chainContract.resolveStatus();

    if (!chainStatus.nextBlockHeight.eq(block.blockHeight)) {
      throw Error(`Does not match with the current block ${chainStatus.nextBlockHeight}.`);
    }

    this.logger.info(`Signing a block for ${chainStatus.nextLeader} at ${block.dataTimestamp}...`);

    const proposedLeaves = this.keyValuesToLeaves(block.leaves);
    const proposedTree = this.sortedMerkleTreeFactory.apply(sortLeaves(proposedLeaves));

    const proposedFcd = sortLeaves(this.keyValuesToLeaves(block.fcd));
    const proposedFcdKeys: string[] = proposedFcd.map(({label}) => label);
    const proposedFcdValues: number[] = proposedFcd.map(({valueBytes}) => LeafValueCoder.decode(valueBytes) as number);

    const affidavit = generateAffidavit(
      block.dataTimestamp,
      proposedTree.getRoot(),
      chainStatus.nextBlockHeight.toNumber(),
      proposedFcdKeys,
      proposedFcdValues,
    );

    const recoveredSigner = await BlockSigner.recoverSigner(affidavit, block.signature);

    if (this.blockchain.wallet.address === recoveredSigner) {
      throw Error('You should not call yourself for signature.');
    }

    if (recoveredSigner !== chainStatus.nextLeader) {
      throw Error(
        `Signature does not belong to the current leader, expected ${chainStatus.nextLeader} got ${recoveredSigner} at block ${chainStatus.blockNumber}/${chainStatus.nextBlockHeight}`,
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

    if (discrepancies) {
      return {error: 'Discrepancy is to high', discrepancies, signature: ''};
    }

    const signature = await signAffidavitWithWallet(this.blockchain.wallet, affidavit);

    this.logger.info(`Signed a block for ${recoveredSigner} at ${block.dataTimestamp}`);

    return {signature: signature, discrepancies: []};
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

  private async checkFeeds(
    timestamp: number,
    feedFiles: string[],
    proposedLeaves: Leaf[][],
  ): Promise<Discrepancy[] | undefined> {
    const feeds: Feeds[] = await Promise.all(feedFiles.map((fileName) => loadFeeds(fileName)));

    const leaves = await this.feedProcessor.apply(timestamp, ...feeds);

    for (let i = 0; i < feeds.length; ++i) {
      const discrepancies = Object.entries(this.findDiscrepancies(leaves[i], proposedLeaves[i], feeds[i]));

      if (discrepancies.length) {
        return sort(discrepancies)
          .desc(([, value]) => value)
          .map(([key, value]) => {
            const discrepancy: Discrepancy = {key, discrepancy: Math.round(value * 100) / 100.0};
            newrelic.recordCustomEvent('PriceDiscrepancy', {...discrepancy});
            return discrepancy;
          });
      }
    }
  }

  private findDiscrepancies(leaves: Leaf[], proposedLeaves: Leaf[], feeds: Feeds): Map<string, number> {
    const leafByLabel: {[label: string]: Leaf} = {};

    leaves.forEach((leaf) => {
      leafByLabel[leaf.label] = leaf;
    });

    const discrepancies: Map<string, number> = new Map();

    proposedLeaves.forEach(({valueBytes: proposedValueBytes, label}) => {
      const leaf = leafByLabel[label];

      if (!leaf) {
        discrepancies.set(label, 100);
        return;
      }

      const proposedValue = LeafValueCoder.decode(proposedValueBytes) as number;
      const value = LeafValueCoder.decode(leaf.valueBytes) as number;
      const {discrepancy} = feeds[leaf.label];

      const diffPerc = (200 * Math.abs(value - proposedValue)) / (value + proposedValue);

      if (discrepancy < diffPerc) {
        discrepancies.set(label, diffPerc);
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
