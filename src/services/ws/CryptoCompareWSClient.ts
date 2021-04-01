import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';

import WSClient from './WSClient';
import Settings from '../../types/Settings';
import {Pair} from '../../types/Feed';

@injectable()
class CryptoCompareWSClient extends WSClient {
  connection: IORedis.Redis;

  subscriptions: {[subscription: string]: Pair} = {};

  connected = false;

  timeBreakTimout = 4 * 60 * 60 * 1000;
  clearTimeBreak?: () => void;

  eventHandlers: {[type: number]: (event: unknown) => void} = {
    5: this.onAggregate.bind(this),
    16: this.onSubscribe.bind(this),
    17: this.onUnsubscribe.bind(this),
    999: this.onHeartbeat.bind(this),
    20: this.onConnected.bind(this),
    3: this.onLoad.bind(this),
  };

  constructor(
    @inject('Settings') settings: Settings
  ) {
    super(`wss://streamer.cryptocompare.com/v2?api_key=${settings.api.cryptocompare.apiKey}`, 6000);

    this.connection = new IORedis(settings.redis.url);
  }

  async getLatestPrice({fsym, tsym}: Pair): Promise<number | null> {
    const value = await this.connection.get(`CryptoCompare::${fsym}~${tsym}`);
    return value === null ? null : parseFloat(value);
  }

  onAggregate({FROMSYMBOL: fsym, TOSYMBOL: tsym, MEDIAN: median}: any): void {
    if (!median) {
      return;
    }

    this.logger.debug(`${fsym}-${tsym}: ${median}`);

    this.connection.set(`CryptoCompare::${fsym}~${tsym}`, median).catch(this.logger.warn);
  }

  onOpen(): void {
    super.onOpen();
  }

  onConnected(event: unknown): void {
    this.connected = true;

    const timeout = setTimeout(this.close.bind(this), this.timeBreakTimout);
    this.clearTimeBreak = () => {
      clearTimeout(timeout);
    };

    const subscriptions = this.subscriptions;
    this.subscriptions = {};
    this.updateSubscription(subscriptions);
  }

  protected onClose() {
    super.onClose();

    this.clearTimeBreak && this.clearTimeBreak();

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
}

export default CryptoCompareWSClient;
