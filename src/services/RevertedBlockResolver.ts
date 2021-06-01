import {getModelForClass} from '@typegoose/typegoose';
import {inject, injectable} from 'inversify';
import newrelic from 'newrelic';
import Block from '../models/Block';
import {BlockRevertedEvent} from '../types/ReportedMetricsEvents';
import {Logger} from 'winston';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;

  async apply(lastSubmittedBlockId: number, nextBlockId: number): Promise<number | undefined> {
    if (lastSubmittedBlockId <= nextBlockId) {
      return;
    }

    this.logger.warn(`Block reverted: from ${lastSubmittedBlockId} --> ${nextBlockId}`);
    newrelic.recordCustomEvent(BlockRevertedEvent, {
      lastSubmittedBlockId: lastSubmittedBlockId,
      nextBlockId: nextBlockId,
    });
    const blockRes = await getModelForClass(Block).collection.deleteMany({blockId: {$gte: nextBlockId}});
    this.logger.info(`because of reverts we deleted ${blockRes.deletedCount} blocks >= ${nextBlockId}`);

    return blockRes.deletedCount;
  }
}

export default RevertedBlockResolver;
