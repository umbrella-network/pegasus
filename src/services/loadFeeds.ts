import fs from 'fs';
import {Validator} from 'jsonschema';
import jsYaml from 'js-yaml';
import axios, {AxiosError} from 'axios';
import schedule from 'node-schedule';
import {Logger} from 'winston';

import Feeds from '../types/Feed.js';
import FeedsSchema from '../config/feeds-schema.js';
import settings from '../config/settings.js';
import Application from '../lib/Application.js';
import {isYamlEmpty} from '../utils/isYamlEmpty.js';

const urlCache = createUrlCache(processYaml, settings.feedsCacheRefreshCronRule);

export default async function loadFeeds(filePath: string): Promise<Feeds> {
  try {
    return isUrl(filePath)
      ? await urlCache.loadFromURL(filePath)
      : await processYaml(await loadFromFile(filePath), true);
  } catch (e) {
    const logger: Logger = Application.get('Logger');
    logger.error(`something wrong with: ${filePath}`);
    throw e;
  }
}

export function isUrl(path: string): boolean {
  try {
    return !!new URL(path);
  } catch (err) {
    return false;
  }
}

async function processYaml(feedData: string, ignoreInvalid = true): Promise<Feeds> {
  if (!feedData || isYamlEmpty(feedData)) {
    return {};
  }

  const [feeds]: any = jsYaml.loadAll(feedData); // eslint-disable-line
  const result = new Validator().validate(feeds, FeedsSchema);
  if (!result.valid) {
    if (!ignoreInvalid) {
      throw new Error(`Feeds validation error:\n${result.errors.map((err) => err.toString()).join('; ')}`);
    }

    result.errors.forEach((error) => {
      delete feeds[error.path[0]];
    });

    const updatedResult = new Validator().validate(feeds, FeedsSchema);
    if (!updatedResult.valid) {
      throw new Error(`Feeds validation error (pass 2):\n${result.errors.map((err) => err.toString()).join('; ')}`);
    }
  }

  return feeds;
}

async function loadFromFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', async (err: unknown, feedData: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(feedData);
      }
    });
  });
}

type ParseData<T> = (data: string) => T;

function createUrlCache<T>(parse: ParseData<T>, cacheRefreshCronRule: string) {
  const etagCache = new Map<string, string>();
  const dataCache = new Map<string, T>();
  const cachedUrls = new Set<string>();

  if (cacheRefreshCronRule) {
    schedule.scheduleJob(cacheRefreshCronRule, () => {
      cachedUrls.clear();
    });
  }

  return {
    loadFromURL: async (url: string, ignoreErrors = true): Promise<T> => {
      const prevData = dataCache.get(url);

      if (cacheRefreshCronRule && cachedUrls.has(url) && prevData) {
        return prevData;
      }

      const etag = etagCache.get(url) || '';
      const randomToken = (Math.random() + 1).toString(36).substring(7);

      try {
        const response = await axios.get(`${url}?token=${randomToken}`, {
          headers: {
            'If-None-Match': etag,
          },
        });

        if (response.status !== 200) {
          throw new Error(response.data);
        }

        if (response.data.Response === 'Error') {
          throw new Error(response.data.Message);
        }

        const {etag: nextEtag} = response.headers;

        const data = parse(response.data);

        etagCache.set(url, nextEtag);
        dataCache.set(url, data);
        cachedUrls.add(url);

        return data;
      } catch (err: unknown) {
        if (!prevData) {
          throw err;
        }

        if ((err as AxiosError).response?.status === 304) {
          return prevData;
        } else if (ignoreErrors) {
          return prevData;
        }

        throw err;
      }
    },
  };
}
