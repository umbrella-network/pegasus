import {injectable} from 'inversify';
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
import {PayableOverrides} from "@ethersproject/contracts";
import {DeviationDispatcher} from "../DeviationDispatcher";
import {ChainsIds} from '../../../types/ChainsIds';
import {UmbrellaFeedsUpdateArgs} from "../../../types/DeviationFeeds";
import {BlockchainType} from "../../../types/Settings";

@injectable()
export class ArbitrumDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.ARBITRUM;
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    // for arbitrum we are only calculating gasLimit
    return undefined;
  }

  protected async calculatePayableOverrides(props?: {nonce?: number, data?: unknown}): Promise<PayableOverrides> {
    // for unknown reason, when we let provider resolve gas limit automatically, it does not work 
    // when we call estimation manually and use result it does work
    const gas = await this.feedsContract.estimateGasForUpdate(props?.data as UmbrellaFeedsUpdateArgs);

    return {
      gasLimit: gas * 15n / 10n // using limit that is 50% more than estimated just in case
    };
  }
}
