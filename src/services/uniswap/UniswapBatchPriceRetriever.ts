import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {Price} from '../../models/Price';
import {Mutex, MutexInterface, withTimeout} from 'async-mutex';
import NodeCache from 'node-cache';
import {LatestPriceProps, MongoDBPriceRepository} from '../../repositories/MongoDBPriceRepository';
import {sleep} from '../../lib/sleep';
import EventEmitter from 'events';



@injectable()
export class UniswapBatchPriceRetriever {
  @inject('Logger') logger!: Logger;
  @inject(MongoDBPriceRepository) priceRepository!: MongoDBPriceRepository;

  lock: MutexInterface;
  timer?: NodeJS.Timeout;
  bufferCreatedAt?: Date;
  buffer!: LatestPriceProps[];
  cache: NodeCache;
  bus: EventEmitter;

  constructor() {
    this.bus = new EventEmitter();
    this.cache = new NodeCache({stdTTL: 120, checkperiod: 120});
    this.lock = withTimeout(new Mutex(), 100);
    this.buffer = [];
  }

  async getLatestPrice(props: LatestPriceProps): Promise<number | undefined> {
    await this.bufferOperation(props); // when batch > 100 or timer > 1sec, flush
    const price = await this.getPrice(props); // block until flushed
    return price?.value;
  }

  private async bufferOperation(props: LatestPriceProps): Promise<void> {
    const release = await this.lock.acquire();
    this.timer ||= setTimeout(async () => await this.flush(), 3000);

    try {
      this.bufferCreatedAt ||= new Date();
      this.buffer.push(props);

      if (this.readyToFlush()) {
        this.logger.info(`[UniswapBatchPriceRetriever] Flushing...`);
        await this.flush();
      }
    } catch (e) {
      this.logger.error('[UniswapBatchPriceRetriever] ', e);
    } finally {
      release();
    }
  }

  private readyToFlush(): boolean {
    if(this.buffer.length >= 100) return true;
    if(this.bufferCreatedAt && ((new Date()).getTime() - this.bufferCreatedAt.getTime()) > 1000) return true;

    return false
  }

  private async flush(): Promise<void> {
    this.timer = undefined;
    this.bufferCreatedAt = undefined;
    const prices = await this.priceRepository.bulkGetLatestPrices(this.buffer);
    this.populateCache(prices);
    this.buffer = [];
    this.bus.emit('flush');
  }

  private populateCache(prices: Price[]): void {
    for (const price of prices) {
      this.cache.set<Price>([price.source, price.symbol].join('/'), price);
    }
  }

  private async getPrice(props: LatestPriceProps): Promise<Price | undefined> {
    return new Promise((resolve, reject) => {
      setTimeout(reject, 5000);

      this.bus.on('flush', () => {
        const price = this.cache.get<Price>([props.source, props.symbol].join('/'));
        if (!price) return resolve();
        if (price.timestamp < props.timestamp.from || price.timestamp > props.timestamp.to) return resolve();

        return resolve(price);
      })
    });
  }
}