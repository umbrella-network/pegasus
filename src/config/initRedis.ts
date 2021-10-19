import Settings from '../types/Settings';
import IORedis, {Redis} from 'ioredis';

export function initRedis(settings: Settings): Redis {
  return new IORedis(settings.redis.url, {
    retryStrategy: (times) => Math.min(times * 50, settings.redis.maxRetryTime),
  });
}
