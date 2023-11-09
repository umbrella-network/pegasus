import {ChainsIds} from '../../types/ChainsIds';

export class SubmitTxKeyResolver {
  static apply(chainId: ChainsIds): string {
    return `SUBMIT_TX_MONITOR_${chainId.toUpperCase()}`;
  }
}
