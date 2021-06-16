import {inject, injectable} from 'inversify';

import SaveMintedBlock from './SaveMintedBlock';
import {MintedBlock} from '../types/MintedBlock';
import {Consensus} from '../types/Consensus';

@injectable()
class BlockRepository {
  @inject(SaveMintedBlock) saveMintedBlock!: SaveMintedBlock;
  
  async saveBlock(chainAddress: string, consensus: Consensus, mintedBlock: MintedBlock): Promise<void> {
    await this.saveMintedBlock.apply({
      id: `block::${mintedBlock.logMint.blockId}`,
      chainAddress,
      dataTimestamp: new Date(consensus.dataTimestamp * 1000),
      timestamp: new Date(),
      leaves: consensus.leaves,
      blockId: mintedBlock.logMint.blockId.toNumber(),
      root: consensus.root,
      fcdKeys: consensus.fcdKeys,
    });
  }
}

export default BlockRepository;
