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

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedSynchronizer) feedSynchronizer!: FeedSynchronizer;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(SaveMintedBlock) saveMintedBlock!: SaveMintedBlock;
  @inject(MintGuard) mintGuard!: MintGuard;

  async apply(): Promise<void> {
    if (!(await this.isLeader())) return;

    const blockHeight = await this.chainContract.getBlockHeight();
    if (!(await this.canMint(blockHeight))) return;

    const leaves = await this.getLatestLeaves();
    const tree = this.sortedMerkleTreeFactory.apply(leaves);

    const affidavit = this.generateAffidavit(tree.getRoot(), blockHeight);
    const signature = await this.signAffidavit(affidavit);
    // TODO: gather signatures from other validators before minting a new block
    await this.mint(tree.getRoot(), [signature]);
    await this.saveBlock(leaves, Number(blockHeight), tree.getRoot());
  }

  private async canMint(blockHeight: BigNumber): Promise<boolean> {
    return await this.mintGuard.apply(Number(blockHeight));
  }

  private async isLeader(): Promise<boolean> {
    const currentLeader = await this.chainContract.getLeaderAddress();
    return currentLeader === this.blockchain.wallet.address;
  }

  private async getLatestLeaves(): Promise<Leaf[]> {
    const feeds: Feed[] = await getModelForClass(Feed).find().exec();
    return (await Promise.all(feeds.map((feed) => this.feedSynchronizer.apply(feed)))).flat();
  }

  private generateAffidavit(root: string, blockHeight: BigNumber): string {
    const encoder = new ethers.utils.AbiCoder();
    const testimony = encoder.encode(['uint256', 'bytes32'], [blockHeight, root]);
    return ethers.utils.keccak256(testimony);
  }

  private async signAffidavit(affidavit: string): Promise<string> {
    const toSign = ethers.utils.arrayify(affidavit)
    return this.blockchain.wallet.signMessage(toSign);
  }

  private splitSignature(signature: string): Signature {
    return ethers.utils.splitSignature(signature);
  }

  private async mint(root: string, signatures: string[]): Promise<void> {
    const components = signatures.map((signature) => this.splitSignature(signature));

    await this.chainContract.submit(
      root,
      components.map((sig) => sig.v),
      components.map((sig) => sig.r),
      components.map((sig) => sig.s),
    );
  }

  private async saveBlock(leaves: Leaf[], blockHeight: number, root: string): Promise<void> {
    await this.saveMintedBlock.apply({leaves, blockHeight, root});
  }
}

export default BlockMinter;
