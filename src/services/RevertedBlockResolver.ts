import {getModelForClass} from '@typegoose/typegoose';
import {inject, injectable} from 'inversify';
import Block from '../models/Block';
import {Logger} from 'winston';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;

  async apply(lastSubmittedBlockHeight: number, nextBlockHeight: number): Promise<number | undefined> {
    if (lastSubmittedBlockHeight <= nextBlockHeight) {
      return;
    }

    this.logger.warn(`Block reverted: from ${lastSubmittedBlockHeight} --> ${nextBlockHeight}`);
    const blockRes = await getModelForClass(Block).collection.deleteMany({height: {$gte: nextBlockHeight}});
    this.logger.info(`because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockHeight}`);

    return blockRes.deletedCount;
  }
}

export default RevertedBlockResolver;
