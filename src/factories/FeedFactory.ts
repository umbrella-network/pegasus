import {injectable} from 'inversify';
import Feeds from '../types/Feed.js';
import {Validator, ValidatorResult} from 'jsonschema';
import FeedsSchema from '../config/feeds-schema.js';
import jsYaml from 'js-yaml';

@injectable()
export class FeedFactory {
  validator: Validator;

  constructor() {
    this.validator = new Validator();
  }

  // TODO: add Uniswap support in the future
  createCollectionFromYaml(data: string): Feeds {
    const feeds = jsYaml.load(data) as Feeds;
    const validation = this.validate(feeds);
    if (!validation.valid) throw new Error(`Invalid YAML ${JSON.stringify(validation.errors)}`);

    return feeds;
  }

  private validate(feeds: unknown): ValidatorResult {
    return this.validator.validate(feeds, FeedsSchema);
  }
}
