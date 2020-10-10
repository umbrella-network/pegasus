import Bull from 'bull';
import { injectable } from 'inversify';
import settings from '../config/settings';

@injectable()
abstract class Worker {
  #queueName!: string;
  #queue!: Bull.Queue;

  abstract apply(job: Bull.Job): void

  get queueName(): string {
    return this.#queueName ||= this.constructor.name;
  }

  get queue(): Bull.Queue {
    return this.#queue ||= new Bull(this.queueName, { redis: settings.redis.url });
  }

  enqueue = async <T>(params: T, opts?: Bull.JobOptions): Promise<Bull.Job<T>> => {
    return this.queue.add(params, opts);
  }

  start = (): void => {
    this.queue.process(this.apply);
  }
}

export default Worker;
