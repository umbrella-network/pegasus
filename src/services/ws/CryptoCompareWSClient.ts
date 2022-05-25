import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';

import WSClient from './WSClient';
import Settings from '../../types/Settings';
import {Pair, PairWithFreshness} from '../../types/Feed';
import StatsDClient from '../../lib/StatsDClient'
import PriceAggregator from '../PriceAggregator';
import TimeService from '../TimeService';
import Timeout from '../../utils/timeout';

@injectable()
class CryptoCompareWSClient extends WSClient {
  priceAggregator: PriceAggregator;

  subscriptions: {[subscription: string]: Pair} = {};

  lastTimeUpdated: {[subscription: string]: number} = {};

  timeService: TimeService;

  static readonly Prefix = 'cca::';

  static readonly DefaultFreshness = 3600;

  settings: Settings;

  connected = false;

  staleReconnectJob?: Timeout;

  reconnectJob?: Timeout;

  truncateJob?: Job;

  staleResubscribeJob?: Timeout;

  eventHandlers: {[type: number]: (event: unknown) => void} = {
    5: this.onAggregate.bind(this),
    16: this.onSubscribe.bind(this),
    17: this.onUnsubscribe.bind(this),
    18: this.onUnsubscribeAll.bind(this),
    999: this.onHeartbeat.bind(this),
    20: this.onConnected.bind(this),
    3: this.onLoad.bind(this),
  };

  constructor(
    @inject('Settings') settings: Settings,
    @inject(TimeService) timeService: TimeService,
    @inject(PriceAggregator) priceAggregator: PriceAggregator,
  ) {
    super(`wss://streamer.cryptocompare.com/v2?api_key=${settings.api.cryptocompare.apiKey}`, settings.api.cryptocompare.reconnectTimeout);

    this.timeService = timeService;
    this.settings = settings;
    this.priceAggregator = priceAggregator;
  }

  async getLatestPrice({fsym, tsym, freshness = CryptoCompareWSClient.DefaultFreshness}: PairWithFreshness, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.valueAfter(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, timestamp, timestamp - freshness);
  }

  onAggregate(payload: any): void {
    const {FROMSYMBOL: fsym, TOSYMBOL: tsym, MEDIAN: median, LASTUPDATE: timestamp} = payload;

    if (!median || !timestamp) {
      return;
    }

    const subscription = `${fsym}~${tsym}`;

    this.lastTimeUpdated[subscription] = Date.now();

    StatsDClient?.gauge(`cpm.${fsym}-${tsym}`, median);
    this.logger.debug(`${subscription}: ${median} at ${timestamp}`);

    this.priceAggregator.add(`${CryptoCompareWSClient.Prefix}${subscription}`, median, timestamp).catch(this.logger.error);
  }

  onOpen(): void {
    super.onOpen();
  }

  onConnected(event: unknown): void {
    this.connected = true;

    this.staleReconnectJob = new Timeout(70, () => {
      this.logger.warn(`closing a stale connection...`);
      this.close();
    });

    this.reconnectJob = new Timeout(this.settings.api.cryptocompare.reconnectTimeoutHours * 60 * 60, () => {
      this.logger.info(`scheduled reconnection...`);
      this.close();
    });

    this.staleResubscribeJob = new Timeout(this.settings.api.cryptocompare.resubscribeTimeoutMinutes * 60, () => {
      this.checkStaleSubscriptions().catch(this.logger.warn);
    });

    this.truncateJob = schedule.scheduleJob(this.settings.api.cryptocompare.truncateCronRule, () => {
      this.logger.info(`truncating prices...`);
      this.truncatePriceAggregator().catch(this.logger.warn);
    });

    const subscriptions = this.subscriptions;
    this.subscriptions = {};
    this.updateSubscription(subscriptions);
  }

  protected onClose(): void {
    super.onClose();

    this.truncateJob?.cancel();
    this.reconnectJob?.cancel();
    this.staleReconnectJob?.cancel();
    this.staleResubscribeJob?.cancel();
    this.lastTimeUpdated = {};

    this.connected = false;
  }

  onHeartbeat(event: unknown): void {
    this.logger.debug(`heartbeat ${event}`);

    this.staleReconnectJob?.reschedule();
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

  onUnsubscribeAll(event: unknown): void {
    this.logger.debug(`unsubscribe all ${event}`);
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

    this.unsubscribeSubscriptions(toUnsubscribe, true);

    this.subscribeSubscriptions(toSubscribe);
  }

  private subscribeSubscriptions(subscriptions: string[]) {
    if (!subscriptions.length) {
      return;
    }

    this.socket?.send(JSON.stringify({
      action: 'SubAdd',
      subs: subscriptions.map((subscription) => `5~CCCAGG~${subscription}`),
    }));
  }

  private unsubscribeSubscriptions(subscriptions: string[], cleanUp: boolean) {
    if (!subscriptions.length) {
      return;
    }

    if (cleanUp) {
      for (const subscription of subscriptions) {
        this.priceAggregator.cleanUp(`${CryptoCompareWSClient.Prefix}${subscription}`).catch(this.logger.warn);
      }
    }

    this.socket?.send(JSON.stringify({
      action: 'SubRemove',
      subs: subscriptions.map((subscription) => `5~CCCAGG~${subscription}`),
    }));
  }

  private async checkStaleSubscriptions(): Promise<void> {
    const toResubscribe = [];

    const currentTime = Date.now(),
      resubscribeTimeout = this.settings.api.cryptocompare.resubscribeTimeoutMinutes * 60 * 1000,
      timeStale = currentTime - resubscribeTimeout;
    let minTimeUpdated = currentTime;

    for (const subscription in this.lastTimeUpdated) {
      const timeUpdated = this.lastTimeUpdated[subscription];
      if (timeUpdated < timeStale) {
        toResubscribe.push(subscription);
      } else {
        minTimeUpdated = Math.min(minTimeUpdated, timeUpdated);
      }
    }

    this.unsubscribeSubscriptions(toResubscribe, false);

    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (!this.connected) {
      return;
    }

    this.subscribeSubscriptions(toResubscribe);

    this.staleResubscribeJob?.reschedule(Math.floor((resubscribeTimeout - (currentTime - minTimeUpdated)) / 1000));
  }

  private async truncatePriceAggregator(): Promise<void> {
    const beforeTimestamp = this.timeService.apply() - this.settings.api.cryptocompare.truncateIntervalMinutes * 60;

    this.logger.info(`Truncating CryptoCompare prices before ${beforeTimestamp}...`);

    await Promise.all(Object.keys(this.subscriptions).map(async (subscription) => {
      const key = `${CryptoCompareWSClient.Prefix}${subscription}`;

      // find a value before a particular timestamp
      const valueTimestamp = await this.priceAggregator.valueTimestamp(key, beforeTimestamp);
      if (!valueTimestamp) {
        // no values to truncate
        return;
      }

      // delete all values before the one we have just found
      await this.priceAggregator.cleanUp(key, valueTimestamp.timestamp);
    }));
  }

  public async allPrices({fsym, tsym}: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`);
  }

  public async latestPrices(pairs: Pair[], beforeTimestamp: number): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return await Promise.all(
      pairs.map(async ({fsym, tsym}) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, beforeTimestamp);

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${fsym}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }
}

export default CryptoCompareWSClient;
