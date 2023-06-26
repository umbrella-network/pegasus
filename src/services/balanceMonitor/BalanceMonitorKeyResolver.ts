import {ChainsIds} from "../../types/ChainsIds";

export class BalanceMonitorKeyResolver {
  static apply(chainId: ChainsIds, wallet: string): string {
    return `BALANCE_MONITOR_${chainId.toUpperCase()}_${wallet.toUpperCase()}`;
  }
}
