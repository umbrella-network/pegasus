import {injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds.js';
import {TriggerTxKeyResolver} from './TriggerTxKeyResolver.js';
import {LastSubmitResolver} from './LastSubmitResolver.js';

@injectable()
export class LastTriggerResolver extends LastSubmitResolver {
  protected key(chainId: ChainsIds): string {
    return TriggerTxKeyResolver.apply(chainId);
  }
}
