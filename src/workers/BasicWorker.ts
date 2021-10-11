import Bull, {Queue, Worker} from 'bullmq';
import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';
import Settings from '../types/Settings';

const MAX_RETRY_TIME = 10000;

@injectable()
abstract class BasicWorker {
  connection: IORedis.Redis;
  #queueName!: string;
  #queue!: Bull.Queue;
  #worker!: Bull.Worker;

  abstract apply(job: Bull.Job): Promise<void>;

  constructor(@inject('Settings') settings: Settings) {
    this.connection = new IORedis(settings.redis.url, {
      retryStrategy(times) {
        const retryTime = Math.min(times * 50, MAX_RETRY_TIME);
        return retryTime;
      },
    });
  }

  get queueName(): string {
    return (this.#queueName ||= this.constructor.name);
  }

  get queue(): Bull.Queue {
    return (this.#queue ||= new Queue(this.queueName, {connection: this.connection}));
  }

  get worker(): Bull.Worker {
    return (this.#worker ||= new Worker(this.queueName, this.apply, {connection: this.connection}));
  }

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    return this.queue.add(this.constructor.name, params, opts);
  };

  start(): void {
    this.worker;
  }
}

export default BasicWorker;
