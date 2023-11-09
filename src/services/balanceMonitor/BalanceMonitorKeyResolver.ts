import {ChainsIds} from '../../types/ChainsIds.js';

export class BalanceMonitorKeyResolver {
  static apply(chainId: ChainsIds, wallet: string): string {
    return `BM_${chainId.toUpperCase()}_${wallet.toUpperCase()}`;
  }
}
