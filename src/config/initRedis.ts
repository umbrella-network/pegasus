import Settings from '../types/Settings.js';
import IORedis, {Redis} from 'ioredis';

export function initRedis(settings: Settings): Redis {
  return new IORedis(settings.redis.url, {
    retryStrategy: (times: number) => Math.min(times * 50, settings.redis.maxRetryTime),
  });
}
