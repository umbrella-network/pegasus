import {injectable} from 'inversify';
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
import {PayableOverrides} from "@ethersproject/contracts";
import {DeviationDispatcher} from "../DeviationDispatcher";
import {ChainsIds} from '../../../types/ChainsIds';
import {BlockchainType} from "../../../types/Settings";

@injectable()
export class MultiversXDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.MULTIVERSX;
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    this.logger.warn('[MultiversXDeviationDispatcher] resolveGasMetrics: TODO');
    return undefined;
  }

  protected async calculatePayableOverrides(props?: {nonce?: number, data?: unknown}): Promise<PayableOverrides> {
    this.logger.warn('[MultiversXDeviationDispatcher] calculatePayableOverrides: TODO');
    // for unknown reason, when we let provider resolve gas limit automatically, it does not work 
    // when we call estimation manually and use result it does work
    // const gas = await this.feedsContract.estimateGasForSubmit(props?.data as UmbrellaFeedsUpdateArgs);

    return {
      // gasLimit: gas * 15n / 10n // using limit that is 50% more than estimated just in case
    };
  }

  protected async cancelPendingTransaction(prevGasPrice: number | undefined, timeout: number): Promise<boolean> {
    this.logger.warn('[MultiversXDeviationDispatcher] cancelPendingTransaction: not supported');
    return false;
  }
}
