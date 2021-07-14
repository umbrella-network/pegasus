import {getModelForClass} from '@typegoose/typegoose';
import {injectable} from 'inversify';
import {HexStringWith0x} from '../types/custom';
import Block from '../models/Block';
import Leaf from '../types/Leaf';
import {BigNumber} from 'ethers';
import {SignedBlockConsensus} from '../types/Consensus';

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
class BlockRepository {
  async saveBlock(
    chainAddress: string,
    consensus: SignedBlockConsensus,
    blockId: BigNumber,
    minted = false,
  ): Promise<void> {
    await this.apply({
      id: `block::${blockId}`,
      chainAddress,
      dataTimestamp: new Date(consensus.dataTimestamp * 1000),
      timestamp: new Date(),
      leaves: consensus.leaves,
      blockId: blockId.toNumber(),
      root: consensus.root,
      fcdKeys: consensus.fcdKeys,
      minted,
    });
  }

  async apply(params: Params): Promise<Block> {
    const mongoBlock = getModelForClass(Block);
    const storedBlock = await mongoBlock.findById(params.id);

    if (storedBlock && storedBlock.minted) {
      throw Error(`attempt to override minted block ${params.id}`);
    }

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

    return mongoBlock.findOneAndUpdate({blockId: block.blockId}, block, {
      upsert: true,
      setDefaultsOnInsert: true,
      new: true,
    });
  }

  private static treeDataFor(leaves: Leaf[]): Record<string, HexStringWith0x> {
    return leaves.map((leaf) => ({[leaf.label]: leaf.valueBytes})).reduce((acc, v) => ({...acc, ...v}), {});
  }
}

export default BlockRepository;
