import {getModelForClass} from '@typegoose/typegoose';
import {injectable} from 'inversify';
import Block from '../models/Block';

@injectable()
class RevertedBlockResolver {
  async apply(blockHeightWithoutConsensus: number): Promise<number | undefined> {
    const blockRes = await getModelForClass(Block).collection.deleteMany({
      height: {$gte: blockHeightWithoutConsensus},
    });
    return blockRes.deletedCount;
  }
}

export default RevertedBlockResolver;
