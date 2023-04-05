import {inject, injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';

import TimeService from './TimeService';
import Block from '../models/Block';
import {sleep} from '../utils/sleep';

@injectable()
class DataPurger {
  @inject(TimeService) timeService!: TimeService;

  async apply(): Promise<void> {
    let removedAll = false;

    while (!removedAll) {
      console.time('DataPurger.chunk');

      try {
        // removing 1K records takes 1~10sec
        const purged = await this.purgeChunk(1000, 6);
        removedAll = purged === 0;
      } catch (e: unknown) {
        // ignoring
        console.log(`[DataPurger] error: ${(<Error>e).message}`);
      }

      console.timeEnd('DataPurger.chunk');

      await sleep(5000);
    }

    console.time('[DataPurger] done.');
  }

  private async purgeChunk(limit: number, months: number): Promise<number> {
    const blockModel = getModelForClass(Block);

    const oneMonth = 30 * 24 * 60 * 60;
    const monthsAgo = this.timeService.apply(months * oneMonth);

    const blocks = await blockModel
      .find({blockId: {$lt: monthsAgo}}, {blockId: true})
      .sort({blockId: -1})
      .limit(limit);
    const blockIds = blocks.map((b) => b.blockId);
    console.log(`[DataPurger] removing blocks older than ${months}mo, found ${blockIds.length}`);

    await blockModel.deleteMany({blockId: {$in: blockIds}});

    return blockIds.length;
  }
}

export default DataPurger;
