import {injectable, inject} from 'inversify';
import {JsonRpcProvider, Block} from '@ethersproject/providers';
import {Logger} from 'winston';
import Settings from '../types/Settings';

interface ProviderComparand {
  blockNumber: number;
  url: string;
}

@injectable()
class RPCSelector {
  @inject('Logger') logger!: Logger;
  readonly urls: string[];
  readonly preferredProviderUrl: string;

  constructor(@inject('Settings') settings: Settings) {
    this.urls = settings.blockchain.provider.urls;
    this.preferredProviderUrl = this.urls[0];
  }

  async apply(): Promise<string> {
    if (this.urls.length === 1 || (await this.isPreferredProviderUpToDate())) {
      return this.preferredProviderUrl;
    } else {
      this.logger.info(`[RPCSelector] Preferred provider isn't up to date. Comparing other available RPCs.`);
      const providers = await Promise.all(this.getProviders(this.urls.slice(1)));
      return this.getMostUpToDateProvider(providers);
    }
  }

  private async isPreferredProviderUpToDate(): Promise<boolean> {
    try {
      const provider = new JsonRpcProvider(this.preferredProviderUrl);
      const block = await provider.getBlock('latest');
      return this.isBlockRecentlyMinted(block);
    } catch (e) {
      return false;
    }
  }

  private isBlockRecentlyMinted(block: Block): boolean {
    const currentDateInSeconds = Math.floor(Date.now() / 1000),
      oneMinute = 60;
    return block.timestamp - (currentDateInSeconds - oneMinute) <= oneMinute;
  }

  private getProviders(providersURLs: string[]): Promise<ProviderComparand>[] {
    return providersURLs.map(async (url) => {
      try {
        const provider = new JsonRpcProvider(url);
        const blockNumber = await provider.getBlockNumber();
        return {blockNumber, url};
      } catch (e) {
        this.logger.info(`[RPCSelector] Failed to get ${url} block number. Reason: ${e.message}`);
        return {blockNumber: 0, url};
      }
    });
  }

  private getMostUpToDateProvider(providers: ProviderComparand[]): string {
    const {url} = providers.reduce((acc, cur) => (acc.blockNumber > cur.blockNumber ? acc : cur));
    return url;
  }
}

export default RPCSelector;
