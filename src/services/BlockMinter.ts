import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import { ethers, BigNumber, Signature } from 'ethers';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import { getModelForClass } from '@typegoose/typegoose';
import Feed from '../models/Feed';
import FeedSynchronizer from './FeedSynchronizer';
import Leaf from '../models/Leaf';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import SaveMintedBlock from './SaveMintedBlock';
import MintGuard from './MintGuard';
import {converters} from '@umb-network/toolbox';
import fs from "fs";
import path from "path";
import FeedValueResolver from "./FeedValueResolver";

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedValueResolver) feedValueResolver!: FeedValueResolver;
  @inject(FeedSynchronizer) feedSynchronizer!: FeedSynchronizer;
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

    const leaves = await this.getLatestLeaves();

    if (!leaves.length) {
      this.logger.error(`we can't get leaves... check API access to feeds.`)
      return
    }

    const [numericFcdKeys, numericFcdValues] = await this.getLatestFrontClassData();
    const tree = this.sortedMerkleTreeFactory.apply(leaves);

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

  private async getLatestLeaves(): Promise<Leaf[]> {
    const feeds: Feed[] = await getModelForClass(Feed).find().exec();
    return (await Promise.all(feeds.map((feed) => this.feedSynchronizer.apply(feed)))).flat();
  }

  // @todo handle case where value is undefined or negative
  private async getLatestFrontClassData(): Promise<[keys: string[], values: number[]]> {
    const feedData = fs.readFileSync(path.resolve(__dirname, '../config/feedsOnChain.json'), 'utf-8');
    const feeds: Feed[] = JSON.parse(feedData).data;
    const keys = feeds.map(feed => feed.leafLabel).sort();
    const values: (number | undefined)[] = await Promise.all(feeds.map((feed) => this.feedValueResolver.apply(feed)));

    return values.reduce((fcd: [keys: string[], values: number[]], value, i) => {
      if (value === undefined) {
        return fcd;
      }

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
