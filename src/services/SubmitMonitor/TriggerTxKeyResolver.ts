import {ChainsIds} from '../../types/ChainsIds';

export class TriggerTxKeyResolver {
  static apply(chainId: ChainsIds): string {
    return `TRIGGER_TX_MONITOR_${chainId.toUpperCase()}`;
  }
}
