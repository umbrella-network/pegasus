import Bull from 'bullmq';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import BlockMinter from '../services/BlockMinter';
import BasicWorker from './BasicWorker';
import Settings from '../types/Settings';
import CryptoCompareWSClient from '../services/ws/CryptoCompareWSClient';
import loadFeeds from '../config/loadFeeds';
import {Pair} from '../types/Feed';

@injectable()
class BlockMintingWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(BlockMinter) blockMinter!: BlockMinter;
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    try {
      this.logger.info(`BlockMintingWorker job run at ${new Date().toISOString()}`);
      await this.blockMinter.apply();
    } catch (e) {
      this.logger.error(e);
    }
  }

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  }

  start = (): void => {
    super.start();

    this.cryptoCompareWSClient.start();

    this.subscribeWS().catch(this.logger.error);
  };

  async subscribeWS(): Promise<void> {
    const feeds = await loadFeeds(this.settings.feedsFile);
    const onChainFeeds = await loadFeeds(this.settings.feedsOnChain);

    const pairs: Pair[] = [...Object.values(feeds), ...Object.values(onChainFeeds)]
      .map((value) => value.inputs).flat()
      .filter(({fetcher}) => fetcher.name === 'CryptoComparePriceWS')
      .map(({fetcher}) => fetcher.params)
      .map(({fsym, tsym}: any) => ({fsym, tsym}));

    this.cryptoCompareWSClient.subscribe(...pairs);
  }
}

export default BlockMintingWorker;
