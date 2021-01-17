import { getModelForClass } from '@typegoose/typegoose';
import { injectable } from 'inversify';
import { v4 as uuid } from 'uuid';
import Block from '../models/Block';
import Leaf from '../models/Leaf';

type Params = {
  id?: string,
  leaves: Leaf[],
  blockHeight: number,
  root: string,
  mintedAt?: Date,
  timestamp?: Date,
  numericFcdKeys: string[]
}

@injectable()
class SaveMintedBlock {
  async apply(params: Params): Promise<Block> {
    const currentTime = new Date();
    const block = new Block();
    block._id = params.id || uuid();
    block.timestamp = params.timestamp || currentTime;
    block.timestamp = params.mintedAt || currentTime;
    block.height = params.blockHeight;
    block.root = params.root;
    block.data = this.treeDataFor(params.leaves);
    block.numericFcdKeys = params.numericFcdKeys;
    await this.attachLeavesToBlockHeight(params.leaves, params.blockHeight);
    return await getModelForClass(Block).create(block);
  }

  private async attachLeavesToBlockHeight(leaves: Leaf[], blockHeight: number): Promise<void> {
    getModelForClass(Leaf)
      .updateMany(
        {
          _id: {
            $in: leaves.map((leaf) => leaf._id)
          }
        },
        {
          $set: {
            blockHeight: blockHeight
          }
        }
      )
      .exec()
  }

  private treeDataFor(leaves: Leaf[]): Record<string, string> {
    return leaves
      .map((leaf) => ({ [leaf.label]: leaf.valueBuffer }))
      .reduce((acc, v) => ({ ...acc, ...v }), {});
  }
}

export default SaveMintedBlock;
