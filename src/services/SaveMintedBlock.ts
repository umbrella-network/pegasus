import {getModelForClass} from '@typegoose/typegoose';
import {injectable} from 'inversify';
import {HexStringWith0x} from '../types/HexStringWith0x';
import {v4 as uuid} from 'uuid';
import Block from '../models/Block';
import Leaf from '../models/Leaf';

type Params = {
  id?: string;
  chainAddress: string;
  leaves: Leaf[];
  blockId: number;
  anchor: number;
  root: string;
  dataTimestamp: Date;
  timestamp: Date;
  numericFcdKeys: string[];
  numericFcdValues: number[];
  votes: Record<string, string>;
  power: string;
  staked: string;
  miner: string;
};

@injectable()
class SaveMintedBlock {
  async apply(params: Params): Promise<Block> {
    const block = new Block();
    block._id = params.id || uuid();
    block.chainAddress = params.chainAddress;
    block.dataTimestamp = params.dataTimestamp;
    block.timestamp = params.timestamp;
    block.blockId = params.blockId;
    block.anchor = params.anchor;
    block.root = params.root;
    block.data = this.treeDataFor(params.leaves);
    block.numericFcdKeys = params.numericFcdKeys;
    block.numericFcdValues = params.numericFcdValues;
    block.votes = params.votes;
    block.power = params.power;
    block.staked = params.staked;
    block.minter = params.miner;
    await this.attachLeavesToBlock(params.leaves, params.blockId);
    return await getModelForClass(Block).create(block);
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

export default SaveMintedBlock;
