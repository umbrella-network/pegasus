import {inject} from 'inversify';
import Bull from 'bullmq';
import LockRepository from '../repositories/LockRepository';
import BasicWorker from './BasicWorker';
import {Logger} from 'winston';

export abstract class SingletonWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(LockRepository) lockRepository!: LockRepository;

  synchronizeWork = async (lockId: string, ttl: number, work: () => void): Promise<void> => {
    let lockAcquired = false;

    try {
      lockAcquired = await this.lock(lockId, ttl);
      if (lockAcquired) await work();
    } finally {
      if (lockAcquired) await this.unlock(lockId);
    }
  };

  isStale = (job: Bull.Job, ageLimit: number): boolean => {
    const age = new Date().getTime() - job.timestamp;
    const isStale = age > ageLimit;
    if (!isStale) return false;

    this.logger.info(`Job ${job.id} is stale - discarding...`);
    return true;
  };

  private lock = async (lockId: string, ttl: number): Promise<boolean> => this.lockRepository.acquire(lockId, ttl);
  private unlock = async (lockId: string): Promise<boolean> => this.lockRepository.release(lockId);
}
