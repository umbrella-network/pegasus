import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BasicAgent} from './BasicAgent.js';
import {UniswapPoolScannerAgent} from './UniswapPoolScannerAgent.js';
import {UniswapPriceScannerAgent} from './UniswapPriceScannerAgent.js';
import {UniswapVerificationAgent} from './UniswapVerificationAgent.js';
import Settings from '../types/Settings.js';

@injectable()
export class AgentCoordinator {
  @inject('Logger') logger!: Logger;
  agents: {[key: string]: BasicAgent} = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject(UniswapPoolScannerAgent) UniswapPoolScannerAgent: UniswapPoolScannerAgent,
    @inject(UniswapPriceScannerAgent) UniswapPriceScannerAgent: UniswapPriceScannerAgent,
    @inject(UniswapVerificationAgent) UniswapVerificationAgent: UniswapVerificationAgent,
  ) {
    const blockchainKey = 'ethereum';

    if (!settings.blockchains[blockchainKey].providerUrl.join('')) {
      return;
    }

    if (!settings.api.uniswap.active) {
      return;
    }

    this.agents = {
      UniswapPoolScannerAgent,
      UniswapPriceScannerAgent,
      UniswapVerificationAgent,
    };
  }

  async start(agentId?: string): Promise<void> {
    if (agentId) {
      this.logger.info(`Starting Agent: ${agentId}`);

      if (!this.agents[agentId]) {
        this.logger.info(`Agent: ${agentId} not active`);
        return;
      }

      this.logger.info(`Starting Agent: ${agentId}`);
      await this.agents[agentId].start();
    } else {
      if (Object.keys(this.agents).length == 0) {
        this.logger.info('Agents list empty.');
        return;
      }

      this.logger.info('Starting all Agents');
      await Promise.all(Object.values(this.agents).map((agent) => agent.start()));
    }
  }
}
