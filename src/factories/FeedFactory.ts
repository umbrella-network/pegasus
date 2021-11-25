import {injectable} from 'inversify';
import Feeds from '../types/Feed';
import {Validator, ValidatorResult} from 'jsonschema';
import FeedsSchema from '../config/feeds-schema';
import {load} from 'js-yaml';

@injectable()
export class FeedFactory {
  validator: Validator;

  constructor() {
    this.validator = new Validator();
  }

  // TODO: add Uniswap support
  createCollectionFromYaml(data: string): Feeds {
    const feeds = load(data) as Feeds;
    const validation = this.validate(feeds);
    if (!validation.valid) throw new Error(`Invalid YAML ${JSON.stringify(validation.errors)}`);

    return feeds;
  }

  private validate(feeds: unknown): ValidatorResult {
    return this.validator.validate(feeds, FeedsSchema);
  }
}
