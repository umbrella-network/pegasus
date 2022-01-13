import {LoopAgent} from './LoopAgent';
import {inject, injectable} from 'inversify';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService';

@injectable()
export class UniswapVerificationAgent extends LoopAgent {
  @inject(UniswapPoolService) poolService!: UniswapPoolService;

  interval = 30 * 60;

  async execute(): Promise<void> {
    this.logger.info('[UniswapVerificationAgent] Updating Verified Uniswap Pools.');
    await this.poolService.updatePoolVerificationStatus();
  }
}
