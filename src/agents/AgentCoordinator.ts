import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BasicAgent} from './BasicAgent';
import {UniswapPoolScannerAgent} from './UniswapPoolScannerAgent';
import {UniswapPriceScannerAgent} from './UniswapPriceScannerAgent';
import {UniswapVerificationAgent} from './UniswapVerificationAgent';
import Settings from '../types/Settings';

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

    if (!settings.api.uniswap.scannerContractId || !settings.api.uniswap.helperContractId) {
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
      this.logger.info('Starting all Agents');
      await Promise.all(Object.values(this.agents).map((agent) => agent.start()));
    }
  }
}
