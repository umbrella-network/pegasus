import {ChainsIds} from '../../types/ChainsIds.js';

export class SubmitTxKeyResolver {
  static apply(chainId: ChainsIds): string {
    return `SUBMIT_TX_MONITOR_${chainId.toUpperCase()}`;
  }
}
