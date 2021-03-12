import {getModelForClass} from '@typegoose/typegoose';
import {inject, injectable} from 'inversify';
import Block from '../models/Block';
import RevertedBlockResolver from "./RevertedBlockResolver";
import {Logger} from "winston";

@injectable()
class MintGuard {
  @inject(RevertedBlockResolver) reveredBlockResolver!: RevertedBlockResolver;
  @inject('Logger') logger!: Logger;

  async apply(blockHeightWithoutConsensus: number): Promise<boolean> {
    let lastSubmittedBlock = await this.getLastSubmittedBlock();

    if (!lastSubmittedBlock) {
      return true;
    }

    if (lastSubmittedBlock.height > blockHeightWithoutConsensus) {
      this.logger.warn(`Block reverted: from ${lastSubmittedBlock.height} --> ${blockHeightWithoutConsensus}`)
      const deletedBlocksCount = await this.reveredBlockResolver.apply(blockHeightWithoutConsensus);
      this.logger.info(`because of reverts we deleted ${deletedBlocksCount} blocks >= ${blockHeightWithoutConsensus}`);

      lastSubmittedBlock = await this.getLastSubmittedBlock();
    }

    return lastSubmittedBlock ? blockHeightWithoutConsensus > lastSubmittedBlock.height : true;
  }

  private async getLastSubmittedBlock(): Promise<Block | undefined> {
    const blocks: Block[] = await getModelForClass(Block)
      .find({})
      .limit(1)
      .sort({height: -1})
      .exec();

    return blocks[0];
  }
}

export default MintGuard;
