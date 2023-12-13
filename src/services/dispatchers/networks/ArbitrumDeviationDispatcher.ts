import {injectable} from 'inversify';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {PayableOverrides} from '@ethersproject/contracts';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {UmbrellaFeedsUpdateArgs} from '../../../types/DeviationFeeds.js';
import {BlockchainType} from '../../../types/Settings.js';
import {FeedContract} from '../../../blockchains/evm/contracts/FeedContract.js';

@injectable()
export class ArbitrumDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.ARBITRUM;
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    // for arbitrum we are only calculating gasLimit
    return undefined;
  }

  protected async calculatePayableOverrides(props?: {nonce?: bigint; data?: unknown}): Promise<PayableOverrides> {
    // for unknown reason, when we let provider resolve gas limit automatically, it does not work
    // when we call estimation manually and use result it does work
    const gas = await (this.feedsContract as FeedContract).estimateGasForUpdate(props?.data as UmbrellaFeedsUpdateArgs);

    return {
      gasLimit: (gas.gasLimit * 15n) / 10n, // using limit that is 50% more than estimated just in case
    };
  }
}
