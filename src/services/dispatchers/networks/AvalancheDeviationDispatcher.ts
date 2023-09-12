import {injectable} from 'inversify';
import {PayableOverrides} from "@ethersproject/contracts";

import {ChainsIds} from '../../../types/ChainsIds';
import {DeviationDispatcher} from "../DeviationDispatcher";
import {BlockchainType} from "../../../types/Settings";

@injectable()
export class AvalancheDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.AVALANCHE;
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async calculatePayableOverrides(props?: {nonce?: number, data?: unknown}): Promise<PayableOverrides> {
    const gasMetrics = await this.resolveGasMetrics();
    if (!gasMetrics) return {};

    const nonce = props?.nonce;

    this.logger.info(`[${this.chainId}] AvalancheBlockDispatcher - using individual gas settings`);
    return {nonce, gasPrice: gasMetrics.gasPrice};
  }
}
