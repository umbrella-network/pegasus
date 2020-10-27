import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import { BigNumber } from 'ethers';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import { getModelForClass } from '@typegoose/typegoose';
import Feed from '../models/Feed';
import FeedSynchronizer from './FeedSynchronizer';
import Leaf from '../models/Leaf';
import MerkleTreeFactory from './MerkleTreeFactory';
import SparseMerkleTree from '../models/SparseMerkleTree';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(FeedSynchronizer) feedSynchronizer!: FeedSynchronizer;
  @inject(MerkleTreeFactory) merkleTreeFactory!: MerkleTreeFactory;

  async apply(): Promise<void> {
    if (!(await this.isLeader())) return;

    const leaves = await this.getLatestLeaves();
    const tree = this.merkleTreeFactory.apply(leaves);
    const blockHeight = await this.chainContract.getBlockHeight();
    await this.mint(leaves, tree.root, blockHeight);
  }

  private isLeader = async (): Promise<boolean> => {
    const currentLeader = await this.chainContract.getLeaderAddress();
    return currentLeader === this.blockchain.wallet.address;
  }

  private getLatestLeaves = async (): Promise<Leaf[]> => {
    const feeds: Feed[] = await getModelForClass(Feed).find().exec();
    return (await Promise.all(feeds.map((feed) => this.feedSynchronizer.apply(feed)))).flat();
  }

  private mint = async (leaves: Leaf[], root: string, blockHeight: BigNumber): Promise<void> => {
    this.chainContract.submit();
    // get latest datums / leaves
    // Build the Merkle tree
    // get the current blockHeight via chainContract.getBlockHeight()
    // Assemble a JSON message with the blockHeight, Merklet root and all the raw leaves
    // ===
    // Get the address of the other validators by querying the validator registry
    // send the JSON to all validators (add HTTP API to Pegasus)
    // they are going to independently check the values against their latest value (within a tolerance)
    // they're going to build the Merkle tree with the data sent
    // and check whether their Merkle root matches up with the one we sent
    // if it matches up they're going to return a signature
    // ====
    // collect list of signatures
    // submit signatures
  }
}

export default BlockMinter;
