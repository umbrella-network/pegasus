import { getModelForClass } from '@typegoose/typegoose';
import { BigNumber } from 'ethers';
import { injectable } from 'inversify';
import { uuid } from 'uuidv4';
import Block from '../models/Block';
import Leaf from '../models/Leaf';

type Params = {
  id?: string,
  leaves: Leaf[],
  blockHeight: BigNumber,
  root: string,
  timestamp?: Date
}

@injectable()
class SaveMintedBlock {
  async apply(params: Params): Promise<Block> {
    const block = new Block();
    block._id = params.id || uuid();
    block.timestamp = params.timestamp || new Date();
    block.height = params.blockHeight.toHexString();
    block.root = params.root;
    block.data = this.treeDataFor(params.leaves);
    await this.attachLeavesToBlockHeight(params.leaves, params.blockHeight);
    return await getModelForClass(Block).create(block);
  }

  private async attachLeavesToBlockHeight(leaves: Leaf[], blockHeight: BigNumber): Promise<void> {
    getModelForClass(Leaf)
      .updateMany(
        {
          _id: {
            $in: leaves.map((leaf) => leaf._id)
          }
        },
        {
          $set: {
            blockHeight: blockHeight.toHexString()
          }
        }
      )
      .exec()
  }

  private treeDataFor(leaves: Leaf[]): Record<string, unknown> {
    return leaves
      .map((leaf) => ({ [leaf.label]: leaf.value }))
      .reduce((acc, v) => ({ ...acc, ...v }), {});
  }
}

export default SaveMintedBlock;
