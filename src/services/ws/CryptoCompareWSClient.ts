import {inject, injectable} from 'inversify';

import WSClient from './WSClient';
import Settings from '../../types/Settings';
import {Pair} from '../../types/Feed';
import StatsDClient from '../../lib/StatsDClient'
import PriceAggregator from '../PriceAggregator';
import TimeService from '../TimeService';

@injectable()
class CryptoCompareWSClient extends WSClient {
  priceAggregator: PriceAggregator;

  subscriptions: {[subscription: string]: Pair} = {};

  timeService: TimeService;

  static readonly Prefix = 'cca::';

  settings: Settings;

  connected = false;

  clearTimeBreak?: () => void;

  clearTruncatePriceAggregatorInterval?: () => void;

  eventHandlers: {[type: number]: (event: unknown) => void} = {
    5: this.onAggregate.bind(this),
    16: this.onSubscribe.bind(this),
    17: this.onUnsubscribe.bind(this),
    999: this.onHeartbeat.bind(this),
    20: this.onConnected.bind(this),
    3: this.onLoad.bind(this),
  };

  constructor(
    @inject('Settings') settings: Settings,
    @inject(TimeService) timeService: TimeService,
    @inject(PriceAggregator) priceAggregator: PriceAggregator,
  ) {
    super(`wss://streamer.cryptocompare.com/v2?api_key=${settings.api.cryptocompare.apiKey}`, 6000);

    this.timeService = timeService;
    this.settings = settings;
    this.priceAggregator = priceAggregator;
  }

  async getLatestPrice({fsym, tsym}: Pair, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.value(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, timestamp);
  }

  onAggregate(payload: any): void {
    const {FROMSYMBOL: fsym, TOSYMBOL: tsym, MEDIAN: median, LASTUPDATE: timestamp} = payload;

    if (!median || !timestamp) {
      return;
    }

    StatsDClient?.gauge(`${fsym}-${tsym}`, median);
    this.logger.debug(`${fsym}-${tsym}: ${median}`);

    this.priceAggregator.add(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, median, timestamp).catch(this.logger.error);
  }

  onOpen(): void {
    super.onOpen();
  }

  onConnected(event: unknown): void {
    this.connected = true;

    const timeout = setTimeout(this.close.bind(this), this.settings.api.cryptocompare.reconnectInterval);
    this.clearTimeBreak = () => {
      clearTimeout(timeout);
    };


    const truncateInterval = setInterval(this.truncatePriceAggregator.bind(this), this.settings.api.cryptocompare.priceExpiryTimeout * 1000);
    this.clearTruncatePriceAggregatorInterval = () => {
      clearInterval(truncateInterval);
    };

    const subscriptions = this.subscriptions;
    this.subscriptions = {};
    this.updateSubscription(subscriptions);
  }

  protected onClose() {
    super.onClose();

    this.clearTimeBreak && this.clearTimeBreak();
    this.clearTruncatePriceAggregatorInterval && this.clearTruncatePriceAggregatorInterval();

    this.connected = false;
  }

  onHeartbeat(event: unknown): void {
    this.logger.debug(`heartbeat ${event}`);
  }

  onLoad(event: unknown): void {
    this.logger.debug(`load ${event}`);
  }

  onSubscribe(event: unknown): void {
    this.logger.debug(`subscribe ${event}`);
  }

  onUnsubscribe(event: unknown): void {
    this.logger.debug(`unsubscribe ${event}`);
  }

  onMessage(message: string): void {
    const event = JSON.parse(message);
    const {TYPE: type} = event;

    const handler = this.eventHandlers[type];
    if (handler) {
      handler(event);
    } else {
      super.onMessage(message);
    }
  }

  subscribe(...pairs: Pair[]): void {
    const subscriptions: {[subscription: string]: Pair} = {};
    pairs.forEach((pair) => {
      subscriptions[`${pair.fsym}~${pair.tsym}`] = pair;
    });
    const updatedSubscriptions = {...this.subscriptions, ...subscriptions};
    this.updateSubscription(updatedSubscriptions);
  }

  unsubscribe(...pairs: Pair[]): void {
    const subscriptions: {[subscription: string]: Pair} = {};
    pairs.forEach((pair) => {
      subscriptions[`${pair.fsym}~${pair.tsym}`] = pair;
    });
    const updatedSubscriptions = {...this.subscriptions};
    Object.keys(subscriptions).forEach((subscription) => delete updatedSubscriptions[subscription]);
    this.updateSubscription(updatedSubscriptions);
  }

  private updateSubscription(subscriptions: {[subscription: string]: Pair}) {
    const toUnsubscribe = Object.keys(this.subscriptions).filter(x => !subscriptions[x]);
    const toSubscribe = Object.keys(subscriptions).filter(x => !this.subscriptions[x]);

    this.subscriptions = subscriptions;

    if (!this.connected) {
      return;
    }

    if (toUnsubscribe.length) {
      for (const subscription of toUnsubscribe) {
        this.priceAggregator.cleanUp(`${CryptoCompareWSClient.Prefix}${subscription}`).catch(this.logger.warn);
      }

      this.socket?.send(JSON.stringify({
        action: 'SubRemove',
        subs: toUnsubscribe.map((subscription) => `5~CCCAGG~${subscription}`),
      }));
    }

    if (toSubscribe.length) {
      this.socket?.send(JSON.stringify({
        action: 'SubAdd',
        subs: toSubscribe.map((subscription) => `5~CCCAGG~${subscription}`),
      }));
    }
  }

  private truncatePriceAggregator(): void {
    const timestamp = this.timeService.apply() - this.settings.api.cryptocompare.priceExpiryTimeout;

    this.logger.info(`Truncating CryptoCompare prices before ${timestamp}...`);

    Object.keys(this.subscriptions).forEach((subscription) => {
      this.priceAggregator.cleanUp(`${CryptoCompareWSClient.Prefix}${subscription}`, timestamp).catch(this.logger.warn);
    });
  }
}

export default CryptoCompareWSClient;
