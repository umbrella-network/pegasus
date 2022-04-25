import {FeedInput} from '@umb-network/toolbox/dist/types/Feed';
import {Factory} from 'rosie';
import {Feed} from '../../../src/types/Feed';

export const feedInputFactory = Factory.define<FeedInput>('feedInput').attr('fetcher', {name: 'TestFetcher'});

export const feedFactory = Factory.define<Feed>('feed')
  .attr('discrepancy', 0.1)
  .attr('precision', 2)
  .attr('inputs', [Factory.build('feedInput')]);
