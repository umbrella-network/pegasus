import Settings from '../types/Settings.js';
import {inject, injectable} from 'inversify';
import Feeds from '../types/Feed.js';
import fs from 'fs/promises';
import {Logger} from 'winston';
import {FeedFactory} from '../factories/FeedFactory.js';
import NodeCache from 'node-cache';
import axios from 'axios';
import {UniswapFeedRepository} from './UniswapFeedRepository.js';
import {DataFilter} from '../services/tools/DataFilter.js';

function isValidURL(string: string): boolean {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === 'http:' || url.protocol === 'https:';
}

@injectable()
export class FeedRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(FeedFactory) feedFactory!: FeedFactory;
  @inject(UniswapFeedRepository) uniswapFeedRepository!: UniswapFeedRepository;

  sourceCache: NodeCache;

  constructor() {
    this.sourceCache = new NodeCache({stdTTL: 120, checkperiod: 120});
  }

  async getFcdFeeds(filter?: string[]): Promise<Feeds> {
    const sources = [this.settings.feedsOnChain];
    let feeds: Feeds = {};
    feeds = this.mergeFeedsIntoCollection(await this.getLocalFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getRemoteFeeds(sources), feeds);
    return this.applyFilter(feeds, filter);
  }

  async getLeafFeeds(filter?: string[]): Promise<Feeds> {
    const sources = [this.settings.feedsFile];
    let feeds: Feeds = {};
    feeds = this.mergeFeedsIntoCollection(await this.getLocalFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getRemoteFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getVerifiedUniswapFeeds(), feeds);
    return this.applyFilter(feeds, filter);
  }

  async getDeviationTriggerFeeds(filter?: string[]): Promise<Feeds> {
    const sources = [this.settings.deviationTrigger.feedsFile];
    let feeds: Feeds = {};
    feeds = this.mergeFeedsIntoCollection(await this.getLocalFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getRemoteFeeds(sources), feeds);
    return this.applyFilter(feeds, filter);
  }

  // TODO: Consider splitting into a LocalFeedRepository
  protected async getLocalFeeds(sources: string[]): Promise<Feeds> {
    const localSources = this.getLocalSources(sources);
    if (localSources.length == 0) return {};

    let collection: Feeds = {};

    for (const source of localSources) {
      try {
        const feeds = await this.loadLocalFeed(source);
        collection = this.mergeFeedsIntoCollection(feeds, collection);
      } catch (e) {
        this.logger.error(`[FeedRepository] Failed to load local source ${source}\n`, e);
      }
    }

    return collection;
  }

  protected async loadLocalFeed(source: string): Promise<Feeds> {
    const cachedFeeds = this.sourceCache.get<Feeds>(source);
    if (cachedFeeds) return cachedFeeds;

    const data = await fs.readFile(source, 'utf-8');
    const feeds = this.feedFactory.createCollectionFromYaml(data);
    this.sourceCache.set<Feeds>(source, feeds, 0); // cached entry never expires
    return feeds;
  }

  // TODO: Consider splitting into a RemoteFeedRepository
  protected async getRemoteFeeds(sources: string[]): Promise<Feeds> {
    const remoteSources = this.getRemoteSources(sources);
    if (remoteSources.length == 0) return {};

    let collection: Feeds = {};

    for (const source of remoteSources) {
      try {
        const feeds = await this.loadRemoteFeed(source);
        collection = this.mergeFeedsIntoCollection(feeds, collection);
      } catch (e) {
        this.logger.error(`[FeedRepository] Failed to load remote source ${source}\n`, e);
      }
    }

    return collection;
  }

  // TODO: Extract right cache TTL from HTTP response
  protected async loadRemoteFeed(url: string): Promise<Feeds> {
    const cachedFeeds = this.sourceCache.get<Feeds>(url);
    if (cachedFeeds) return cachedFeeds;

    const response = await axios.get(url);
    if (response.status !== 200) throw new Error(response.data);
    if (response.data.Response === 'Error') throw new Error(response.data.Message);
    if (!response.data) return {};

    const feeds = this.feedFactory.createCollectionFromYaml(response.data);
    this.sourceCache.set<Feeds>(url, feeds);
    return feeds;
  }

  // TODO: Consider splitting into a UniswapFeedRepository
  async getVerifiedUniswapFeeds(): Promise<Feeds> {
    if (!this.settings.api.uniswap.active) {
      return {};
    }

    const cachedFeeds = this.sourceCache.get<Feeds>('uniswap');
    if (cachedFeeds) return cachedFeeds;

    let collection: Feeds = {};
    const feeds = await this.uniswapFeedRepository.getVerifiedFeeds();
    feeds.forEach((f) => (collection = this.mergeFeedsIntoCollection({[<string>f.symbol]: f}, collection)));
    this.sourceCache.set<Feeds>('uniswap', collection);
    return collection;
  }

  protected mergeFeedsIntoCollection(feeds: Feeds, collection: Feeds): Feeds {
    for (const [feedId, feed] of Object.entries(feeds)) {
      if (collection[feedId]) {
        const inputs = collection[feedId].inputs || [];
        collection[feedId].inputs = inputs.concat(feed.inputs || []);
      } else {
        collection[feedId] = feed;
      }
    }

    return collection;
  }

  protected getLocalSources(sources: string[]): string[] {
    return sources.filter((source) => !isValidURL(source));
  }

  protected getRemoteSources(sources: string[]): string[] {
    return sources.filter((source) => isValidURL(source));
  }

  protected applyFilter(feeds: Feeds, filter?: string[]): Feeds {
    if (!filter || filter.length === 0) return feeds;

    return DataFilter.filter(feeds, filter);
  }
}
