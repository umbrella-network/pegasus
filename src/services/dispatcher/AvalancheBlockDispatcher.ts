import {injectable} from 'inversify';
import {PayableOverrides} from "@ethersproject/contracts";

import {BlockDispatcher} from './BlockDispatcher';
import {ChainsIds} from '../../types/ChainsIds';
import {ChainSubmitArgs} from "../../types/ChainSubmit";

@injectable()
export class AvalancheBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.AVALANCHE;

  protected async calculatePayableOverrides(data: ChainSubmitArgs, nonce?: number): Promise<PayableOverrides> {
    const gasMetrics = await this.resolveGasMetrics();
    if (!gasMetrics) return {};

    this.logger.info(`[${this.chainId}] AvalancheBlockDispatcher - using individual gas settings`);
    return {nonce, gasPrice: gasMetrics.gasPrice};
  }
}
