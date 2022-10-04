import {inject, injectable} from 'inversify';

import {LoopAgent} from './LoopAgent';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService';
import Settings from '../types/Settings';

@injectable()
export class UniswapVerificationAgent extends LoopAgent {
  @inject(UniswapPoolService) poolService!: UniswapPoolService;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.interval = settings.api.uniswap.verificationInterval;
  }

  async execute(): Promise<void> {
    this.logger.info('[UniswapVerificationAgent] Updating Verified Uniswap Pools.');
    await this.poolService.updatePoolVerificationStatus();
  }
}
