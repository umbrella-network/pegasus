import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {PayableOverrides} from '@ethersproject/contracts';

import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';

export abstract class NonEvmDeviationDispatcher extends DeviationDispatcher {
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    this.logger.debug('[NonEvmDeviationDispatcher] resolveGasMetrics: not implemented');
    return undefined;
  }

  // protected async calculatePayableOverrides(props?: {nonce?: number, data?: unknown}): Promise<PayableOverrides> {
  protected async calculatePayableOverrides(): Promise<PayableOverrides> {
    this.logger.debug('[NonEvmDeviationDispatcher] calculatePayableOverrides: not implemented');
    return {};
  }

  // protected async cancelPendingTransaction(prevGasPrice: number | undefined, timeout: number): Promise<boolean> {
  protected async cancelPendingTransaction(): Promise<boolean> {
    this.logger.debug('[MultiversXDeviationDispatcher] cancelPendingTransaction: not supported');
    return false;
  }
}
