import {injectable} from 'inversify';

import {ChainsIds} from "../../types/ChainsIds";
import {TriggerTxKeyResolver} from "./TriggerTxKeyResolver";
import {LastSubmitResolver} from "./LastSubmitResolver";

@injectable()
export class LastTriggerResolver extends LastSubmitResolver {
  protected key(chainId: ChainsIds): string {
    return TriggerTxKeyResolver.apply(chainId);
  }
}
