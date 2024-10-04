import {getModelForClass} from '@typegoose/typegoose';
import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {Logger} from 'winston';

import {HexStringWith0x} from '../types/custom.js';
import Block from '../models/Block.js';
import Leaf from '../types/Leaf.js';
import {SignedBlockConsensus} from '../types/Consensus.js';
import TimeService from '../services/TimeService.js';
import {IPurger} from '../types/IPurge.js';

type Params = {
  id: string;
  chainAddress: string;
  leaves: Leaf[];
  blockId: number;
  root: string;
  dataTimestamp: Date;
  timestamp: Date;
  fcdKeys: string[];
  minted: boolean;
};

@injectable()
class BlockRepository implements IPurger {
  @inject('Logger') protected logger!: Logger;
  @inject(TimeService) timeService!: TimeService;

  private logPrefix = '[BlockRepository]';

  async saveBlock(chainAddress: string, consensus: SignedBlockConsensus, minted = false): Promise<void> {
    await this.apply({
      id: uuid(),
      chainAddress,
      dataTimestamp: new Date(consensus.dataTimestamp * 1000),
      timestamp: new Date(),
      leaves: consensus.leaves,
      blockId: consensus.dataTimestamp,
      root: consensus.root,
      fcdKeys: consensus.fcdKeys,
      minted,
    });
  }

  async apply(params: Params): Promise<Block> {
    const mongoBlock = getModelForClass(Block);

    const block = new Block();
    block._id = params.id;
    block.chainAddress = params.chainAddress;
    block.dataTimestamp = params.dataTimestamp;
    block.timestamp = params.timestamp;
    block.blockId = params.blockId;
    block.root = params.root;
    block.data = BlockRepository.treeDataFor(params.leaves);
    block.fcdKeys = params.fcdKeys;
    block.minted = params.minted;

    return mongoBlock.create(block);
  }

  async purge(): Promise<number> {
    // removing 1K records takes 1~10sec
    const limit = 1000;
    const months = 6;

    const blockModel = getModelForClass(Block);

    const oneMonth = 30 * 24 * 60 * 60;
    const monthsAgo = this.timeService.apply(months * oneMonth);

    const blocks = await blockModel
      .find({blockId: {$lt: monthsAgo}}, {blockId: true})
      .sort({blockId: -1})
      .limit(limit);
    const blockIds = blocks.map((b) => b.blockId);

    if (blockIds.length == 0) return 0;

    this.logger.info(`${this.logPrefix} removing blocks older than ${months}mo, found ${blockIds.length}`);

    await blockModel.deleteMany({blockId: {$in: blockIds}});

    return blockIds.length;
  }

  private static treeDataFor(leaves: Leaf[]): Record<string, HexStringWith0x> {
    return leaves.map((leaf) => ({[leaf.label]: leaf.valueBytes})).reduce((acc, v) => ({...acc, ...v}), {});
  }
}

export default BlockRepository;
