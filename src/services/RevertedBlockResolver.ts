import {getModelForClass} from '@typegoose/typegoose';
import {inject, injectable} from 'inversify';
import newrelic from 'newrelic';
import Block from '../models/Block';
import {BlockRevertedEvent} from '../constants/ReportedMetricsEvents';
import {Logger} from 'winston';

@injectable()
class RevertedBlockResolver {
  @inject('Logger') logger!: Logger;

  async apply(
    lastBlockMinted: boolean | undefined,
    lastSubmittedBlockId: number,
    nextBlockId: number,
  ): Promise<number | undefined> {
    // first, check the case, where you save block as signer, block were not minted
    // and now its your turn to vote for this round
    if (!lastBlockMinted && lastSubmittedBlockId === nextBlockId) {
      const blockRes = await getModelForClass(Block).collection.deleteOne({blockId: lastSubmittedBlockId});
      this.logger.info(`Removing ${blockRes.deletedCount} not minted block: ${lastSubmittedBlockId}`);
      return;
    }

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
