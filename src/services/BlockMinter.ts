import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Signature} from 'ethers';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Leaf from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import SaveMintedBlock from './SaveMintedBlock';
import MintGuard from './MintGuard';
import {converters} from '@umb-network/toolbox';
import FeedProcessor from "./FeedProcessor";
import LeafPersistor from './LeafPersistor';
import loadFeeds from "../config/loadFeeds";

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

  async apply(): Promise<void> {
    if (!(await this.isLeader())) return;

    const blockHeight = await this.chainContract.getBlockHeight();

    if (!(await this.canMint(blockHeight))) {
      this.logger.info(`Skipping blockHeight: ${blockHeight.toString()}...`);
      return;
    }

    this.logger.info(`Proposing new block for blockHeight: ${blockHeight.toString()}...`);

    const feeds = await loadFeeds('../config/feeds.json');
    const leaves = await this.feedProcessor.apply(feeds);

    if (!leaves.length) {
      this.logger.error(`we can't get leaves... check API access to feeds.`);
      return;
    }

    for (const leaf of leaves) {
      await this.leafPersistor.apply(leaf);
    }

    const tree = this.sortedMerkleTreeFactory.apply(leaves);

    const firstClassFeeds = await loadFeeds('../config/feedsOnChain.json');
    const firstClassLeaves = await this.feedProcessor.apply(firstClassFeeds);

    const [numericFcdKeys, numericFcdValues] = this.formatFirstClassData(firstClassLeaves);

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

  // @todo handle case where value is undefined or negative
  private formatFirstClassData(feeds: Leaf[]): [keys: string[], values: number[]] {
    const keys = feeds.map(({label}) => label).sort();
    const values: number[] = feeds.map(({value}) => value);

    return values.reduce((fcd: [keys: string[], values: number[]], value, i) => {
      fcd[0].push(keys[i]);
      fcd[1].push(value);
      return fcd;
    }, [[], []]);
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
