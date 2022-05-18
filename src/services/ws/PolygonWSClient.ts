import {inject, injectable} from 'inversify';
import {Job} from 'node-schedule';

import WSClient from './WSClient';
import Settings from '../../types/Settings';
import {Pair, PairWithFreshness} from '../../types/Feed';
import TimeService from '../TimeService';
import Timeout from '../../utils/timeout';
import StatsDClient from '../../lib/StatsDClient';
import {PriceRepository} from '../../repositories/PriceRepository';

@injectable()
class PolygonWSClient extends WSClient {
  timeService: TimeService;

  static readonly Prefix = 'piow::';

  static readonly Source = 'polygonWSClient';

  static readonly DefaultFreshness = 3600;

  settings: Settings;

  connected = false;

  authenticated = false;

  reconnectJob?: Timeout;

  truncateJob?: Job;

  subscriptions: {[subscription: string]: Pair} = {};

  @inject(PriceRepository) priceRepository!: PriceRepository;
  constructor(@inject('Settings') settings: Settings, @inject(TimeService) timeService: TimeService) {
    super(`wss://socket.polygon.io/crypto`, settings.api.polygonIO.reconnectTimeout);

    this.timeService = timeService;
    this.settings = settings;
  }

  async getLatestPrice(pair: PairWithFreshness, timestamp: number): Promise<number | undefined> {
    const aggregatorKey = PolygonWSClient.aggregatorKey(pair);
    const afterTimestamp = timestamp - pair.freshness;

    return this.priceRepository.getLatestPrice({
      symbol: aggregatorKey,
      source: PolygonWSClient.Source,
      timestamp: {
        from: new Date(afterTimestamp * 1000),
        to: new Date(timestamp * 1000),
      },
    });
  }

  onAggregate({pair: symbol, e: timestamp, c: price}: {pair: string; e: number; c: number}): void {
    timestamp = Math.floor(timestamp / 1000);
    const [fsym, tsym] = symbol.split('-');

    const aggregatorKey = PolygonWSClient.aggregatorKey({fsym, tsym});

    StatsDClient?.gauge(`pol.XA.${fsym}-${tsym}`, price);
    this.logger.info(`${aggregatorKey}: ${price} at ${timestamp}`);

    this.priceRepository
      .saveBatch([
        {
          symbol: aggregatorKey,
          source: PolygonWSClient.Source,
          value: price,
          timestamp: new Date(timestamp * 1000),
        },
      ])
      .catch(this.logger.error);
  }

  onOpen(): void {
    super.onOpen();

    this.socket?.send(JSON.stringify({action: 'auth', params: this.settings.api.polygonIO.apiKey}));
  }

  onAuthenticated(): void {
    this.logger.info(`${this.constructor.name} authenticated`);

    this.authenticated = true;

    this.reconnectJob = new Timeout(this.settings.api.cryptocompare.reconnectTimeoutHours * 60 * 60, () => {
      this.logger.info(`scheduled reconnection...`);
      this.close();
    });

    const subscriptions = this.subscriptions;
    this.subscriptions = {};
    this.updateSubscription(subscriptions);
  }

  onConnected(event: unknown): void {
    this.connected = true;
  }

  protected onClose(): void {
    super.onClose();

    this.reconnectJob?.cancel();

    this.connected = false;
    this.authenticated = false;
  }

  onMessage(message: string): void {
    const events = JSON.parse(message);

    for (let i = 0; i < events.length; ++i) {
      const event = events[i];
      const {ev, status} = event;

      if (ev === 'status') {
        if (status === 'connected') {
          this.onConnected(event);
          continue;
        } else if (status === 'auth_success') {
          this.onAuthenticated();
          continue;
        }
      } else if (ev === 'XA') {
        this.onAggregate(event);
        continue;
      }

      console.warn(`[message] Data received from polygon: ${JSON.stringify(event)}`);
    }
  }

  subscribe(...pairs: Pair[]): void {
    const subscriptions: {[subscription: string]: Pair} = {};
    pairs.forEach((pair) => {
      subscriptions[`${pair.fsym}-${pair.tsym}`] = pair;
    });
    const updatedSubscriptions = {...this.subscriptions, ...subscriptions};
    this.updateSubscription(updatedSubscriptions);
  }

  unsubscribe(...pairs: Pair[]): void {
    const subscriptions: {[subscription: string]: Pair} = {};
    pairs.forEach((pair) => {
      subscriptions[`${pair.fsym}-${pair.tsym}`] = pair;
    });
    const updatedSubscriptions = {...this.subscriptions};
    Object.keys(subscriptions).forEach((subscription) => delete updatedSubscriptions[subscription]);
    this.updateSubscription(updatedSubscriptions);
  }

  private updateSubscription(subscriptions: {[subscription: string]: Pair}) {
    const toUnsubscribe = Object.entries(this.subscriptions)
      .filter(([k]) => !subscriptions[k])
      .map(([, v]) => v);
    const toSubscribe = Object.entries(subscriptions)
      .filter(([k]) => !this.subscriptions[k])
      .map(([, v]) => v);

    this.subscriptions = subscriptions;

    if (!this.authenticated) {
      return;
    }

    this.unsubscribeSubscriptions(toUnsubscribe);

    this.subscribeSubscriptions(toSubscribe);
  }

  private subscribeSubscriptions(pairs: Pair[]) {
    if (!pairs.length) {
      return;
    }

    pairs.forEach(({fsym, tsym}) => {
      console.log(`XA.${fsym}-${tsym}`);
      this.socket?.send(
        JSON.stringify({
          action: 'subscribe',
          params: `XA.${fsym}-${tsym}`,
        }),
      );
    });
  }

  private unsubscribeSubscriptions(pairs: Pair[]) {
    if (!pairs.length) {
      return;
    }

    pairs.forEach(({fsym, tsym}) => {
      this.socket?.send(
        JSON.stringify({
          action: 'unsubscribe',
          params: `XA.${fsym}-${tsym}`,
        }),
      );
    });
  }

  private static aggregatorKey({fsym, tsym}: Pair) {
    return `${fsym}-${tsym}`;
  }
}

export default PolygonWSClient;
