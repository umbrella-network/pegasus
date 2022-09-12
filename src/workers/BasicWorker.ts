import Bull, {Queue, Worker} from 'bullmq';
import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';
import Settings from 'src/types/Settings';

@injectable()
abstract class BasicWorker {
  @inject('Redis')
  connection!: IORedis.Redis;
  @inject('Settings')
  settings!: Settings;

  #queueName!: string;
  #queue!: Bull.Queue;
  #worker!: Bull.Worker;

  abstract apply(job: Bull.Job): Promise<void>;

  get queueName(): string {
    return (this.#queueName ||= this.constructor.name);
  }

  get queue(): Bull.Queue {
    return (this.#queue ||= new Queue(this.queueName, {connection: this.connection}));
  }

  get concurrency(): number {
    let workersCount = Object.keys(this.settings.blockchain.multiChains).length;
    workersCount += 2; // MetricsWorker + BlockMintingWorker
    console.log('workersCount: ', workersCount);
    return workersCount;
  }

  get worker(): Bull.Worker {
    return (this.#worker ||= new Worker(this.queueName, this.apply, {
      connection: this.connection,
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
    this.worker;
  }
}

export default BasicWorker;
