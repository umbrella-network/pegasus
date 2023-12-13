import {injectable} from 'inversify';
import {PayableOverrides} from '@ethersproject/contracts';

import {BlockDispatcher} from '../BlockDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class AvalancheBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.AVALANCHE;
  readonly blockchainType = BlockchainType.LAYER2;

  protected async calculatePayableOverrides(props?: {nonce?: bigint; data?: unknown}): Promise<PayableOverrides> {
    const gasMetrics = await this.resolveGasMetrics();
    if (!gasMetrics) return {};

    const nonce = props?.nonce;

    this.logger.info(`[${this.chainId}] AvalancheBlockDispatcher - using individual gas settings`);
    return {nonce, gasPrice: gasMetrics.gasPrice};
  }
}
