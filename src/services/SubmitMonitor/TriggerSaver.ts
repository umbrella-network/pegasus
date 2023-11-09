import {injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds.js';
import {TriggerTxKeyResolver} from './TriggerTxKeyResolver.js';
import {SubmitSaver} from './SubmitSaver.js';

@injectable()
export class TriggerSaver extends SubmitSaver {
  protected key(chainId: ChainsIds): string {
    return TriggerTxKeyResolver.apply(chainId);
  }
}
