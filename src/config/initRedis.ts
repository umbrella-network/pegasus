import Settings from '../types/Settings';
import IORedis, {Redis} from 'ioredis';

export function initRedis(settings: Settings['redis']): Redis {
  return new IORedis(settings.url, {
    retryStrategy: (times) => Math.min(times * 50, settings.maxRetryTime),
  });
}
