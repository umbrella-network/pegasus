import {Factory} from 'rosie';

import {Feed, FeedInput} from '../../../src/types/Feed.js';
import {FetcherName} from '../../../src/types/fetchers.js';

export const feedInputFactory = Factory.define<FeedInput>('feedInput').attr('fetcher', {
  name: 'TestFetcher' as FetcherName,
  params: {
    ticker: 'any-ticker',
  },
});

export const feedFactory = Factory.define<Feed>('feed')
  .attr('discrepancy', 0.1)
  .attr('precision', 2)
  .attr('inputs', <FeedInput[]>[Factory.build('feedInput')]);
