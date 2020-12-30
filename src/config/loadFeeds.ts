import fs from 'fs';
import {Validator} from 'jsonschema';
import Feeds from 'src/types/Feed';

import FeedsSchema from './feeds-schema';

export default async function loadFeeds(filePath: string): Promise<Feeds> {
  return new Promise((resolve, reject) => {
     fs.readFile(filePath, 'utf-8', (err, feedData) => {
      if (err) {
        reject(err);
        return;
      }

      const feeds = JSON.parse(feedData) as Feeds;
      const result = new Validator().validate(feeds, FeedsSchema);
      if (!result.valid) {
        reject(new Error(`Feeds validation error:\n${result.errors.map((err) => err.toString()).join('; ')}`));
      }

      resolve(feeds);
    });
  });
}
