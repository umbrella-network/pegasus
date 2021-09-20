import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import * as grpc from '@grpc/grpc-js';

import {StreamAggregatesSpotExchangeRateServiceV1Client} from '@kaiko-data/sdk-node/sdk/sdk_grpc_pb';
import {StreamAggregatesSpotExchangeRateResponseV1} from '@kaiko-data/sdk-node/sdk/stream/aggregates_spot_exchange_rate_v1/response_pb';
import {StreamAggregatesSpotExchangeRateRequestV1} from '@kaiko-data/sdk-node/sdk/stream/aggregates_spot_exchange_rate_v1/request_pb';

import Settings from '../types/Settings';
import {Pair} from '../types/Feed';

import {price} from '@umb-network/validator';

import PriceRepository from '../repositories/PriceRepository';
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
  priceRepository: PriceRepository;
  timeService: TimeService;
  // eslint-disable-next-line
  connMap: Map<string, any> = new Map();

  updatedPricesCount: number;

  static readonly Prefix = 'kaiko::';
  static readonly DefaultFreshness = 3600;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(TimeService) timeService: TimeService,
    @inject(PriceRepository) priceRepository: PriceRepository,
  ) {
    this.timeService = timeService;
    this.settings = settings;
    this.priceRepository = priceRepository;
    this.updatedPricesCount = 0;
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

  /**
   * Cancels all open connecitons
   */
  cancelAll(): void {
    this.connMap.forEach((conn) => {
      conn.cancel();
    });
  }

  /**
   * Cancels one connection and removes it from the pool
   * @param pair 'fsym-tsym'
   */
  private cancelOne(pair: string): void {
    this.connMap.get(pair).cancel();
    this.connMap.delete(pair);
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

        this.logger.info(`${LOG_PREFIX} ${this.connMap.size} active requests`);
      }
    }, checkPeriodMs);
  }

  private spotExchangeRequest(credentials: grpc.CallCredentials, pairs: Pair[]): void {
    const client = new StreamAggregatesSpotExchangeRateServiceV1Client(
      this.settings.api.kaiko.rpcUrl,
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
    const call = client.subscribe(request);

    this.connMap.set(pair, call);

    call.on('data', (response: StreamAggregatesSpotExchangeRateResponseV1) => {
      const priceEntry: PriceEntry = {
        price: parseFloat(response.getPrice()),
        timestamp: response.getUid(),
      };

      const pair = response.getCode();

      buffer[pair] = buffer[pair] ?? [];
      buffer[pair] = [...buffer[pair], priceEntry];

      if (Date.now() - time0 >= PERSISTANCE_AGGREGATION_PERIOD_MS) {
        time0 = Date.now();
        Object.keys(buffer).forEach((key) => {
          const timestamp = Math.floor(Date.now() / 1000);
          this.priceRepository
            .savePrice(KaikoPriceStreamClient.Prefix, key, this.calculateMean(buffer[key]), timestamp)
            .then(() => this.updatedPricesCount++);
        });
        buffer = {};
      }
    });

    call.on('end', () => {
      this.logger.warn(`${LOG_PREFIX} Spot Exchange Rate Stream ended`);
    });

    call.on('error', (error: grpc.ServiceError) => {
      if (error.code === grpc.status.CANCELLED) {
        this.logger.error(`${LOG_PREFIX} CANCELLED: ${error}. Pair: ${pair}`);
        return;
      }
      if (error.message.includes('RST_STREAM')) {
        this.logger.warn(`${LOG_PREFIX} RESET. Resubscribing ${pair}`);
        return setTimeout(() => {
          this.subscribePair(client, request, pair);
        }, 10000);
      }
      this.logger.error(`${LOG_PREFIX} ${error}. Pair: ${pair}`);
      this.cancelOne(pair);
    });
  }

  private calculateMean(registries: PriceEntry[]): number {
    const prices = registries.map((registry) => registry.price);
    return price.mean(prices);
  }
}

export default KaikoPriceStreamClient;
