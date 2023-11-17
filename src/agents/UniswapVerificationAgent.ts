import {inject, injectable} from 'inversify';

import {LoopAgent} from './LoopAgent.js';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService.js';
import Settings from '../types/Settings.js';

@injectable()
export class UniswapVerificationAgent extends LoopAgent {
  @inject(UniswapPoolService) poolService!: UniswapPoolService;

  readonly uniswapActive: boolean;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.interval = settings.api.uniswap.verificationInterval;
    this.uniswapActive = settings.api.uniswap.active;
  }

  async execute(): Promise<void> {
    if (!this.uniswapActive) {
      this.logger.info('[UniswapVerificationAgent] not active');
      return;
    }

    this.logger.info('[UniswapVerificationAgent] Updating Verified Uniswap Pools.');
    await this.poolService.updatePoolVerificationStatus();
  }
}
