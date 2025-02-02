import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

// This code will be refactor in the next PR
import {BasicAgent} from './BasicAgent.js';
// import {UniswapPoolScannerAgent} from './UniswapPoolScannerAgent.js';
// import {UniswapPriceScannerAgent} from './UniswapPriceScannerAgent.js';
// import {UniswapVerificationAgent} from './UniswapVerificationAgent.js';

@injectable()
export class AgentCoordinator {
  @inject('Logger') logger!: Logger;
  agents: {[key: string]: BasicAgent} = {};

  constructor() {
    // @inject('Settings') settings: Settings,
    // @inject(UniswapPoolScannerAgent) UniswapPoolScannerAgent: UniswapPoolScannerAgent,
    // @inject(UniswapPriceScannerAgent) UniswapPriceScannerAgent: UniswapPriceScannerAgent,
    // @inject(UniswapVerificationAgent) UniswapVerificationAgent: UniswapVerificationAgent,
    // @inject(SovrynPoolScannerAgent) sovrynPoolScannerAgent: SovrynPoolScannerAgent,
    //const blockchainKey = 'ethereum';

    // if (!settings.blockchains[blockchainKey].providerUrl.join('')) {
    //   return;
    // }

    // if (!settings.api.uniswap.active) {
    //   return;
    // }

    this.agents = {
      // UniswapPoolScannerAgent,
      // UniswapPriceScannerAgent,
      // UniswapVerificationAgent,
      // sovrynPoolScannerAgent,
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
