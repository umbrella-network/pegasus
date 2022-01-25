import {inject, injectable} from 'inversify';
import {BasicAgent} from './BasicAgent';
import {UniswapPoolScannerAgent} from './UniswapPoolScannerAgent';
import {UniswapPriceScannerAgent} from './UniswapPriceScannerAgent';
import {UniswapVerificationAgent} from './UniswapVerificationAgent';
import {Logger} from 'winston';

@injectable()
export class AgentCoordinator {
  @inject('Logger') logger!: Logger;
  agents!: {[key: string]: BasicAgent};

  constructor(
    @inject(UniswapPoolScannerAgent) UniswapPoolScannerAgent: UniswapPoolScannerAgent,
    @inject(UniswapPriceScannerAgent) UniswapPriceScannerAgent: UniswapPriceScannerAgent,
    @inject(UniswapVerificationAgent) UniswapVerificationAgent: UniswapVerificationAgent,
  ) {
    this.agents = {
      UniswapPoolScannerAgent,
      UniswapPriceScannerAgent,
      UniswapVerificationAgent,
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
