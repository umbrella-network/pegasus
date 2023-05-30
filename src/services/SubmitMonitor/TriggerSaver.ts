import {injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds';
import {TriggerTxKeyResolver} from "./TriggerTxKeyResolver";
import {SubmitSaver} from "./SubmitSaver";

@injectable()
export class TriggerSaver extends SubmitSaver {
  protected key(chainId: ChainsIds): string {
    return TriggerTxKeyResolver.apply(chainId);
  }
}
