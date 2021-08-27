import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import * as grpc from '@grpc/grpc-js';

import {StreamAggregatesSpotExchangeRateServiceV1Client} from '../lib/kaiko-sdk-node/sdk/sdk_grpc_pb';
import {StreamAggregatesSpotExchangeRateResponseV1} from '../lib/kaiko-sdk-node/sdk/stream/aggregates_spot_exchange_rate_v1/response_pb';
import {StreamAggregatesSpotExchangeRateRequestV1} from '../lib/kaiko-sdk-node/sdk/stream/aggregates_spot_exchange_rate_v1/request_pb';

import Settings from '../types/Settings';
import {Pair, PairWithFreshness} from '../types/Feed';

import {price} from '@umb-network/validator';

import PriceAggregator from '../services/PriceAggregator';
import TimeService from '../services/TimeService';

const PERSISTANCE_AGGREGATION_PERIOD_MS = 5000;
const LOG_PREFIX = 'Kaiko Stream:';

type PriceEntry = {
  price: number;
  timestamp: string;
};

@injectable()
class KaikoPriceStreamClient {
  @inject('Logger') logger!: Logger;

  settings: Settings;
  priceAggregator: PriceAggregator;
  timeService: TimeService;
  // eslint-disable-next-line
  call: any;

  updatedPricesCount: number;

  static readonly Prefix = 'kaiko::';
  static readonly DefaultFreshness = 3600;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(TimeService) timeService: TimeService,
    @inject(PriceAggregator) priceAggregator: PriceAggregator,
  ) {
    this.timeService = timeService;
    this.settings = settings;
    this.priceAggregator = priceAggregator;
    this.updatedPricesCount = 0;
  }

  async getLatestPrice(
    {fsym, tsym, freshness = KaikoPriceStreamClient.DefaultFreshness}: PairWithFreshness,
    timestamp: number,
  ): Promise<number | null> {
    return await this.priceAggregator.valueAfter(
      `${KaikoPriceStreamClient.Prefix}${fsym}~${tsym}`,
      timestamp,
      timestamp - freshness,
    );
  }

  private savePrice(pair: string, price: number, timestamp: number) {
    const formattedPair = pair.toUpperCase().replace('-', '~');

    return this.priceAggregator
      .add(`${KaikoPriceStreamClient.Prefix}${formattedPair}`, price, timestamp)
      .then(() => this.updatedPricesCount++)
      .catch((error) => this.logger.error(`${LOG_PREFIX} ${error}`));
  }

  start(pairs: Pair[]): void {
    const metaCallback = (_params: unknown, callback: (err: Error | null, metadata?: grpc.Metadata) => void) => {
      const meta = new grpc.Metadata();
      meta.add('Authorization', `Bearer ${this.settings.api.kaiko.apiKey}`);
      callback(null, meta);
    };

    // eslint-disable-next-line
    const channelCreds = grpc.credentials.createSsl() as any;
    const callCreds = grpc.credentials.createFromMetadataGenerator(metaCallback);
    const credentials = grpc.credentials.combineCallCredentials(channelCreds, callCreds);

    // Create a request for streaming Spot Exchange Rate Prices
    this.spotExchangeRequest(credentials, pairs);
    this.healthCheck();
  }

  close(): void {
    this.call.cancel();
  }

  /**
   * Pairs should be formatted like this:
   * ['tsym1-fsym1,tsym2-fsym2,tsym3-fsym3']
   */
  private formatPairs(pairs: Pair[]): string[] {
    return pairs.map((pair) => `${pair.fsym}-${pair.tsym}`.toLowerCase());
  }

  private healthCheck(): void {
    const checkPeriodMs = 10000;
    let time0 = Date.now();

    setInterval(() => {
      if (Date.now() - time0 >= checkPeriodMs) {
        this.logger.info(`${LOG_PREFIX} updated ${this.updatedPricesCount} prices in the last ${checkPeriodMs} ms`);
        this.updatedPricesCount = 0;
        time0 = Date.now();
      }
    }, 1000);
  }

  private spotExchangeRequest(credentials: grpc.CallCredentials, pairs: Pair[]): void {
    const client = new StreamAggregatesSpotExchangeRateServiceV1Client(
      'gateway-v0-grpc.kaiko.ovh:443',
      credentials as unknown as grpc.ChannelCredentials,
    );
    const request = new StreamAggregatesSpotExchangeRateRequestV1();

    const formattedPairs = this.formatPairs(pairs);

    formattedPairs.forEach((pair) => {
      this.subscribePair(client, request, pair);
    });
  }

  private subscribePair(
    client: StreamAggregatesSpotExchangeRateServiceV1Client,
    request: StreamAggregatesSpotExchangeRateRequestV1,
    pair: string,
  ) {
    let buffer: {
      [pair: string]: PriceEntry[];
    } = {};

    let time0 = Date.now();

    request.setCode(pair);
    request.setSources(false);
    request.setAggregate('1m');

    this.logger.info(`${LOG_PREFIX} Subscribing pair: ${pair}`);
    this.call = client.subscribe(request);

    this.call.on('data', (response: StreamAggregatesSpotExchangeRateResponseV1) => {
      const priceRegistry: PriceEntry = {
        price: parseFloat(response.getPrice()),
        timestamp: response.getUid(),
      };

      const pair = response.getCode();

      buffer[pair] = buffer[pair] ? buffer[pair] : [];
      buffer[pair] = [...buffer[pair], priceRegistry];

      if (Date.now() - time0 >= PERSISTANCE_AGGREGATION_PERIOD_MS) {
        time0 = Date.now();
        Object.keys(buffer).forEach((key) => {
          const timestamp = Math.floor(Date.now() / 1000);
          this.savePrice(key, this.calculateMean(buffer[key]), timestamp);
        });
        buffer = {};
      }
    });

    this.call.on('end', () => {
      this.logger.warn(`${LOG_PREFIX} Spot Exchange Rate Stream ended`);
    });

    this.call.on('error', (error: grpc.ServiceError) => {
      if (error.code === grpc.status.CANCELLED) {
        this.logger.error(`${LOG_PREFIX} CANCELLED: ${error}. Pair: ${pair}`);
        return;
      }
      if (error.message.includes('RST_STREAM')) {
        this.logger.warn(`${LOG_PREFIX} RESET. Resubscribing ${pair}`);
        setTimeout(() => {
          this.subscribePair(client, request, pair);
        }, 10000);
      }
      this.logger.error(`${LOG_PREFIX} ${error}. Pair: ${pair}`);
    });
  }

  private calculateMean(registries: PriceEntry[]): number {
    const prices = registries.map((registry) => registry.price);
    return price.mean(prices);
  }

  public async latestPrices(
    pairs: Pair[],
    maxTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return await Promise.all(
      pairs.map(async ({fsym, tsym}) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(
          `${KaikoPriceStreamClient.Prefix}${fsym}~${tsym}`,
          maxTimestamp,
        );
        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${fsym}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }

  public async allPrices({fsym, tsym}: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${KaikoPriceStreamClient.Prefix}${fsym}~${tsym}`);
  }
}

export default KaikoPriceStreamClient;
