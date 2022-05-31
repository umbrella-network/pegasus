import {inject, injectable} from 'inversify';
import {LoopAgent} from './LoopAgent';
import Settings from '../types/Settings';
import BlockMinter from '../services/BlockMinter';

@injectable()
export class BlockMintingAgent extends LoopAgent {
  @inject(BlockMinter) blockMinter!: BlockMinter;

  // Using a fixed interval can introduce drift over time, consider fixed time scheduling
  constructor(@inject('Settings') settings: Settings) {
    super();
    this.interval = settings.consensus.roundInterval;
  }

  async execute(): Promise<void> {
    try {
      this.logger.debug('[BlockMintingAgent] Starting Block Minter.');
      await this.blockMinter.apply();
      this.logger.debug('[BlockMintingAgent] Block Minter Finished.');
    } catch (e) {
      this.logger.error('[BlockMintingAgent] Error: ', e);
    }
  }
}
