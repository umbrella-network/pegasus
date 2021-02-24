import { getModelForClass } from '@typegoose/typegoose';
import { injectable } from 'inversify';
import Block from '../models/Block';

@injectable()
class MintGuard {
  async apply(blockHeight: number): Promise<boolean> {
    const lastMintedBlock = await this.getLastMintedBlock();

    return lastMintedBlock ? blockHeight > lastMintedBlock.height : true;
  }

  private async getLastMintedBlock(): Promise<Block | undefined> {
    const blocks: Block[] = await getModelForClass(Block)
      .find({})
      .limit(1)
      .sort({ height: -1 })
      .exec();

    return blocks[0];
  }
}

export default MintGuard;
