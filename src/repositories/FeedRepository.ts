import Settings from '../types/Settings';
import {inject, injectable} from 'inversify';
import Feeds from '../types/Feed';
import fs from 'fs/promises';
import {Logger} from 'winston';
import {FeedFactory} from '../factories/FeedFactory';
import NodeCache from 'node-cache';
import axios from 'axios';
import {UniswapFeedRepository} from './UniswapFeedRepository';

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

  async getFcdFeeds(): Promise<Feeds> {
    const sources = [this.settings.feedsOnChain];
    let feeds: Feeds = {};
    feeds = this.mergeFeedsIntoCollection(await this.getLocalFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getRemoteFeeds(sources), feeds);
    return feeds;
  }

  async getLeafFeeds(): Promise<Feeds> {
    const sources = [this.settings.feedsFile];
    let feeds: Feeds = {};
    feeds = this.mergeFeedsIntoCollection(await this.getLocalFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getRemoteFeeds(sources), feeds);
    feeds = this.mergeFeedsIntoCollection(await this.getVerifiedUniswapFeeds(), feeds);
    return feeds;
  }

  // TODO: Consider splitting into a LocalFeedRepository
  private async getLocalFeeds(sources: string[]): Promise<Feeds> {
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

  private async loadLocalFeed(source: string): Promise<Feeds> {
    const cachedFeeds = this.sourceCache.get<Feeds>(source);
    if (cachedFeeds) return cachedFeeds;

    const data = await fs.readFile(source, 'utf-8');
    const feeds = this.feedFactory.createCollectionFromYaml(data);
    this.sourceCache.set<Feeds>(source, feeds, 0); // cached entry never expires
    return feeds;
  }

  // TODO: Consider splitting into a RemoteFeedRepository
  private async getRemoteFeeds(sources: string[]): Promise<Feeds> {
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
  private async loadRemoteFeed(url: string): Promise<Feeds> {
    const cachedFeeds = this.sourceCache.get<Feeds>(url);
    if (cachedFeeds) return cachedFeeds;

    const response = await axios.get(url);
    if (response.status !== 200) throw new Error(response.data);
    if (response.data.Response === 'Error') throw new Error(response.data.Message);

    const feeds = this.feedFactory.createCollectionFromYaml(response.data);
    this.sourceCache.set<Feeds>(url, feeds);
    return feeds;
  }

  // TODO: Consider splitting into a UniswapFeedRepository
  async getVerifiedUniswapFeeds(): Promise<Feeds> {
    const cachedFeeds = this.sourceCache.get<Feeds>('uniswap');
    if (cachedFeeds) return cachedFeeds;

    let collection: Feeds = {};
    const feeds = await this.uniswapFeedRepository.getVerifiedFeeds();
    feeds.forEach((f) => (collection = this.mergeFeedsIntoCollection({[<string>f.symbol]: f}, collection)));
    this.sourceCache.set<Feeds>('uniswap', collection);
    return collection;
  }

  private mergeFeedsIntoCollection(feeds: Feeds, collection: Feeds): Feeds {
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

  private getLocalSources(sources: string[]): string[] {
    return sources.filter((source) => !isValidURL(source));
  }

  private getRemoteSources(sources: string[]): string[] {
    return sources.filter((source) => isValidURL(source));
  }
}
