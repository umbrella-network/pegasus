import Bull, {Queue, Worker} from 'bullmq';
import {inject, injectable} from 'inversify';
import {Redis} from 'ioredis';
import Settings from 'src/types/Settings';
import {LogPrinter} from '../services/tools/LogPrinter.js';

@injectable()
abstract class BasicWorker extends LogPrinter {
  @inject('Redis') connection!: Redis;
  @inject('Settings') settings!: Settings;

  #queueName!: string;
  #queue!: Bull.Queue;
  #worker!: Bull.Worker;

  abstract apply(job: Bull.Job): Promise<void>;

  get queueName(): string {
    return (this.#queueName ||= this.constructor.name);
  }

  get queue(): Bull.Queue {
    return (this.#queue ||= new Queue(this.queueName, {
      connection: this.connection.options,
    }));
  }

  get concurrency(): number {
    let workersCount = Object.keys(this.settings.blockchain.multiChains).length * 2;
    const liquiditiesCount = Object.keys(this.settings.jobs?.liquidities || {}).length;
    workersCount += liquiditiesCount;
    workersCount += Object.keys(this.settings.scheduler.fetchers).length;
    workersCount += ['MetricsWorker', 'ValidatorListWorker', 'BlockMintingWorker', 'DeviationLeaderWorker'].length;
    this.logger.debug(`[BasicWorker] concurrency: ${workersCount}`);
    return workersCount;
  }

  get worker(): Bull.Worker {
    return (this.#worker ||= new Worker(this.queueName, this.apply, {
      connection: this.connection.options,
      concurrency: this.concurrency,
    }));
  }

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const jobOptions = {
      removeOnComplete: 100,
      removeOnFail: 100,
      stackTraceLimit: 100,
      ...opts,
    };

    return this.queue.add(this.queueName, params, jobOptions);
  };

  start(): void {
    process.on('SIGTERM', this.shutdown);
    process.on('SIGINT', this.shutdown);
    this.worker;
  }

  private shutdown = async () => {
    await this.worker.close(true);
    process.exit(0);
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    this.logger.debug(`[BasicWorker] age ${age} > ${job.data.settings.interval}?`);
    return age > job.data.settings.interval;
  };
}

export default BasicWorker;
