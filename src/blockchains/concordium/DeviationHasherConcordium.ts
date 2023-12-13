import {injectable} from 'inversify';
import {createHash} from 'crypto';

import {PriceData} from '../../types/DeviationFeeds.js';
import {ConcordiumAddress} from './utils/ConcordiumAddress.js';
import {toViewMessageHashParameter} from './utils/toViewMessageHashParameter.js';
import {createViewMessageHashParameter} from './contracts/generated/umbrella_feeds_umbrella_feeds.js';
import {FeedName} from '../../types/Feed.js';

@injectable()
export class DeviationHasherConcordium {
  static apply(_networkId: number, target: string, names: FeedName[], priceDatas: PriceData[]): string {
    if (priceDatas.length == 0) throw new Error('[DeviationHasherConcordium] no data');

    const params = toViewMessageHashParameter(ConcordiumAddress.fromIndexedString(target), names, priceDatas);
    const data = createViewMessageHashParameter(params);

    // slice(4) will remove `signers_and_signatures` part
    return createHash('sha256').update(data.buffer.slice(4)).digest('hex');
  }
}
