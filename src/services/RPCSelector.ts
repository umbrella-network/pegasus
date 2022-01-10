import {injectable, inject} from 'inversify';
import {JsonRpcProvider, Block} from '@ethersproject/providers';
import {Logger} from 'winston';
import Settings from '../types/Settings';

@injectable()
class RPCSelector {
  @inject('Logger') logger!: Logger;
  readonly urls: string[];

  constructor(@inject('Settings') settings: Settings) {
    this.urls = settings.blockchain.provider.urls;
  }

  async apply(): Promise<string> {
    if (this.urls.length > 1) {
      const providerUrl = await this.getMostUpToDateProvider();

      if (providerUrl) {
        this.logger.info(`[RPCSelector] Found provider URL ${providerUrl}`);
        return providerUrl;
      }

      this.logger.info(`[RPCSelector] No provider with recently minted block found. Using: ${this.urls[0]}`);
    }

    return this.urls[0];
  }

  private async getMostUpToDateProvider(): Promise<string | void> {
    for (const url of this.urls) {
      try {
        const provider = new JsonRpcProvider(url);
        const block = await provider.getBlock('latest');

        if (this.isBlockRecentlyMinted(block)) {
          return url;
        }
      } catch (e) {
        this.logger.error(`[RPCSelector] RPC ${url} is failing. Trying the next in line...`);
      }
    }
  }

  private isBlockRecentlyMinted(block: Block): boolean {
    const currentDate = Math.floor(Date.now() / 1000),
      oneMinute = 60;
    return block.timestamp - (currentDate - oneMinute) <= oneMinute;
  }
}

export default RPCSelector;
