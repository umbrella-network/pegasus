import {ChainsIds} from '../../types/ChainsIds.js';

export class TriggerTxKeyResolver {
  static apply(chainId: ChainsIds): string {
    return `TRIGGER_TX_MONITOR_${chainId.toUpperCase()}`;
  }
}
