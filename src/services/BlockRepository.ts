import {getModelForClass} from '@typegoose/typegoose';
import {injectable} from 'inversify';
import {HexStringWith0x} from '../types/custom';
import {v4 as uuid} from 'uuid';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import {BigNumber} from 'ethers';
import {SignedBlockConsensus} from '../types/Consensus';

type Params = {
  id?: string;
  chainAddress: string;
  leaves: Leaf[];
  blockId: number;
  root: string;
  dataTimestamp: Date;
  timestamp: Date;
  fcdKeys: string[];
};

@injectable()
class BlockRepository {
  async saveBlock(chainAddress: string, consensus: SignedBlockConsensus, blockId: BigNumber): Promise<void> {
    await this.apply({
      id: `block::${blockId}`,
      chainAddress,
      dataTimestamp: new Date(consensus.dataTimestamp * 1000),
      timestamp: new Date(),
      leaves: consensus.leaves,
      blockId: blockId.toNumber(),
      root: consensus.root,
      fcdKeys: consensus.fcdKeys,
    });
  }

  async apply(params: Params): Promise<Block> {
    const block = new Block();
    block._id = params.id || uuid();
    block.chainAddress = params.chainAddress;
    block.dataTimestamp = params.dataTimestamp;
    block.timestamp = params.timestamp;
    block.blockId = params.blockId;
    block.root = params.root;
    block.data = this.treeDataFor(params.leaves);
    block.fcdKeys = params.fcdKeys;
    await this.attachLeavesToBlock(params.leaves, params.blockId);
    return getModelForClass(Block).findOneAndUpdate({blockId: block.blockId}, block, {
      upsert: true,
      setDefaultsOnInsert: true,
      new: true,
    });
  }

  private async attachLeavesToBlock(leaves: Leaf[], blockId: number): Promise<void> {
    return getModelForClass(Leaf)
      .updateMany(
        {
          _id: {
            $in: leaves.map((leaf) => leaf._id),
          },
        },
        {
          $set: {
            blockId: blockId,
          },
        },
      )
      .exec();
  }

  private treeDataFor(leaves: Leaf[]): Record<string, HexStringWith0x> {
    return leaves.map((leaf) => ({[leaf.label]: leaf.valueBytes})).reduce((acc, v) => ({...acc, ...v}), {});
  }
}

export default BlockRepository;
