import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BasicAgent} from './BasicAgent';
import {UniswapPoolScannerAgent} from './UniswapPoolScannerAgent';
import {UniswapPriceScannerAgent} from './UniswapPriceScannerAgent';
import {UniswapVerificationAgent} from './UniswapVerificationAgent';
import {FeedAgent} from './FeedAgent';

@injectable()
export class AgentCoordinator {
  @inject('Logger') logger!: Logger;
  agents!: {[key: string]: BasicAgent};

  constructor(
    @inject(UniswapPoolScannerAgent) UniswapPoolScannerAgent: UniswapPoolScannerAgent,
    @inject(UniswapPriceScannerAgent) UniswapPriceScannerAgent: UniswapPriceScannerAgent,
    @inject(UniswapVerificationAgent) UniswapVerificationAgent: UniswapVerificationAgent,
    @inject(FeedAgent) FeedAgent: FeedAgent,
  ) {
    this.agents = {
      UniswapPoolScannerAgent,
      UniswapPriceScannerAgent,
      UniswapVerificationAgent,
      FeedAgent,
    };
  }

  async start(agentId?: string): Promise<void> {
    if (agentId) {
      this.logger.info(`Starting Agent: ${agentId}`);
      await this.agents[agentId].start();
    } else {
      this.logger.info('Starting all Agents');
      await Promise.all(Object.values(this.agents).map((agent) => agent.start()));
    }
  }
}
