import {Logger} from 'winston';
import sort from 'fast-sort';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Signature} from 'ethers';
import {converters} from '@umb-network/toolbox';

import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import SaveMintedBlock from './SaveMintedBlock';
import MintGuard from './MintGuard';
import FeedProcessor from "./FeedProcessor";
import LeafPersistor from './LeafPersistor';
import loadFeeds from "../config/loadFeeds";
import Settings from "../types/Settings";

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(LeafPersistor) leafPersistor!: LeafPersistor;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(SaveMintedBlock) saveMintedBlock!: SaveMintedBlock;
  @inject(MintGuard) mintGuard!: MintGuard;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<void> {
    if (!(await this.isLeader())) return;

    const blockHeight = await this.chainContract.getBlockHeight();

    if (!(await this.canMint(blockHeight))) {
      this.logger.info(`Skipping blockHeight: ${blockHeight.toString()}...`);
      return;
    }

    this.logger.info(`Proposing new block for blockHeight: ${blockHeight.toString()}...`);

    const feeds = await loadFeeds(this.settings.feedsFile);
    const leaves = await this.feedProcessor.apply(feeds);

    if (!leaves.length) {
      this.logger.error(`we can't get leaves... check API access to feeds.`);
      return;
    }

    for (const leaf of leaves) {
      await this.leafPersistor.apply(leaf);
    }

    const tree = this.sortedMerkleTreeFactory.apply(BlockMinter.sortLeaves(leaves));

    const firstClassFeeds = await loadFeeds(this.settings.feedsOnChain);
    const firstClassLeaves = BlockMinter.sortLeaves(await this.feedProcessor.apply(firstClassFeeds));

    const [numericFcdKeys, numericFcdValues] = [firstClassLeaves.map(({label}) => label), firstClassLeaves.map(({value}) => value)];

    const affidavit = this.generateAffidavit(tree.getRoot(), blockHeight, numericFcdKeys, numericFcdValues);
    const signature = await this.signAffidavit(affidavit);

    // TODO: gather signatures from other validators before minting a new block
    const mint = await this.mint(tree.getRoot(), numericFcdKeys, numericFcdValues, [signature]);

    if (mint) {
      await this.saveBlock(leaves, Number(blockHeight), tree.getRoot(), numericFcdKeys);
    }
  }

  private async canMint(blockHeight: BigNumber): Promise<boolean> {
    const votersCount = await this.chainContract.getBlockVotersCount(blockHeight);
    return votersCount.isZero() && await this.mintGuard.apply(Number(blockHeight));
  }

  private async isLeader(): Promise<boolean> {
    const currentLeader = await this.chainContract.getLeaderAddress();
    return currentLeader === this.blockchain.wallet.address;
  }

  private static sortLeaves(feeds: Leaf[]): Leaf[] {
    return sort(feeds).asc(({label}) => label);
  }

  private generateAffidavit(root: string, blockHeight: BigNumber, keys: string[], values: number[]): string {
    const encoder = new ethers.utils.AbiCoder();
    let testimony = encoder.encode(['uint256', 'bytes32'], [blockHeight, root]);

    keys.forEach((key, i) => {
      testimony += ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'uint256'],
        [converters.strToBytes32(key), converters.numberToUint256(values[i])]).slice(2);
    })

    return ethers.utils.keccak256(testimony);
  }

  private async signAffidavit(affidavit: string): Promise<string> {
    const toSign = ethers.utils.arrayify(affidavit)
    return this.blockchain.wallet.signMessage(toSign);
  }

  private static splitSignature(signature: string): Signature {
    return ethers.utils.splitSignature(signature);
  }

  private async mint(root: string, keys: string[], values: number[], signatures: string[]): Promise<boolean> {
    try {
      const components = signatures.map((signature) => BlockMinter.splitSignature(signature));

      const tx = await this.chainContract.submit(
        root,
        keys.map(converters.strToBytes32),
        values.map(converters.numberToUint256),
        components.map((sig) => sig.v),
        components.map((sig) => sig.r),
        components.map((sig) => sig.s),
      );

      const receipt = await tx.wait();
      return receipt.status == 1;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  private async saveBlock(leaves: Leaf[], blockHeight: number, root: string, numericFcdKeys: string[]): Promise<void> {
    await this.saveMintedBlock.apply({leaves, blockHeight, root, numericFcdKeys});
  }
}

export default BlockMinter;
