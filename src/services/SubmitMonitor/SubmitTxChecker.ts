import {inject, injectable} from 'inversify';

import {ChainsIds} from '../../types/ChainsIds';
import {LastSubmitResolver} from "./LastSubmitResolver";

@injectable()
export class SubmitTxChecker {
  @inject(LastSubmitResolver) lastTxResolver!: LastSubmitResolver;

  async apply(chainId: ChainsIds, dataTimestamp: number): Promise<boolean> {
    const submitMonitor = await this.lastTxResolver.apply(chainId);

    if (!submitMonitor) {
      return false;
    }

    return dataTimestamp <= submitMonitor.dataTimestamp;
  }
}
