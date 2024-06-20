import {inject, injectable} from 'inversify';
import jsYaml from 'js-yaml';
import {Logger} from 'winston';
import {Validator, ValidatorResult} from 'jsonschema';
import Feeds from '../types/Feed.js';
import FeedsSchema from '../config/feeds-schema.js';
import {isYamlEmpty} from '../utils/isYamlEmpty.js';

@injectable()
export class FeedFactory {
  @inject('Logger') private logger!: Logger;

  validator: Validator;

  constructor() {
    this.validator = new Validator();
  }

  // TODO: add Uniswap support in the future
  createCollectionFromYaml(data: string): Feeds {
    if (isYamlEmpty(data)) {
      this.logger.warn('[FeedFactory] Empty YAML');
      return {} as Feeds;
    }

    const feeds = jsYaml.load(data) as Feeds;
    const validation = this.validate(feeds);

    if (!validation.valid) {
      if (validation.errors.every((error) => error.property.split('.').pop() == 'fetcher')) {
        this.logger.warn(`[FeedFactory] Invalid YAML: ${validation.errors.map((e) => e.property)}`);
      } else {
        throw new Error(`[FeedFactory] Invalid YAML ${JSON.stringify(validation.errors)}`);
      }
    }

    return feeds;
  }

  private validate(feeds: unknown): ValidatorResult {
    return this.validator.validate(feeds, FeedsSchema);
  }
}
