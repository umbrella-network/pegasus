import {Factory} from 'rosie';

import {Feed, FeedInput} from '../../../src/types/Feed.js';

export const feedInputFactory = Factory.define<FeedInput>('feedInput').attr('fetcher', {name: 'TestFetcher'});

export const feedFactory = Factory.define<Feed>('feed')
  .attr('discrepancy', 0.1)
  .attr('precision', 2)
  .attr('inputs', <FeedInput[]>[Factory.build('feedInput')]);
