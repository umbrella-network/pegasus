import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';

@injectable()
class LockRepository {
  @inject('Redis')
  connection!: IORedis.Redis;

  acquire = async (lockId: string, ttl: number): Promise<boolean> => {
    const res = await this.connection.set(this.getLockKey(lockId), 1, 'NX', 'PX', ttl);
    return res == 'OK';
  };

  release = async (lockId: string): Promise<boolean> => {
    const res = await this.connection.del(this.getLockKey(lockId));
    return res > 0;
  };

  getLockKey = (lockId: string): string => `lock::${lockId}`;
}

export default LockRepository;
