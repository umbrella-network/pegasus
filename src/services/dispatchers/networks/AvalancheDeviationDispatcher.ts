import {injectable} from 'inversify';
import {PayableOverrides} from '@ethersproject/contracts';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class AvalancheDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.AVALANCHE;
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async calculatePayableOverrides(props?: {nonce?: bigint; data?: unknown}): Promise<PayableOverrides> {
    if (this.blockchain.chainSettings.transactions.useDefaultGasEstimation) return {};

    const gasMetrics = await this.resolveGasMetrics();
    if (!gasMetrics) return {};

    const nonce = props?.nonce;

    this.logger.info(`[${this.chainId}] AvalancheBlockDispatcher - using individual gas settings`);
    return {nonce, gasPrice: gasMetrics.gasPrice};
  }
}
