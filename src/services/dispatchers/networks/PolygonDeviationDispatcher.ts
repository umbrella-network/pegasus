import {injectable} from 'inversify';
import {PayableOverrides} from '@ethersproject/contracts';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation.js';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {DeviationDispatcher} from '../DeviationDispatcher.js';
import {BlockchainType} from '../../../types/Settings.js';
import {FeedContract} from '../../../blockchains/evm/contracts/FeedContract.js';
import {UmbrellaFeedsUpdateArgs} from '../../../types/DeviationFeeds.js';

@injectable()
export class PolygonDeviationDispatcher extends DeviationDispatcher {
  readonly chainId = ChainsIds.POLYGON;
  readonly blockchainType = BlockchainType.ON_CHAIN;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    // for polygon we are only calculating gasLimit
    return undefined;
  }

  protected async calculatePayableOverrides(props?: {nonce?: number; data?: unknown}): Promise<PayableOverrides> {
    const transactions = this.settings.blockchain.multiChains[this.chainId]?.transactions;

    if (transactions) {
      const {maxPriorityFeePerGas, maxFeePerGas} = transactions;

      if (maxFeePerGas && maxPriorityFeePerGas) {
        return {maxFeePerGas, maxPriorityFeePerGas};
      }
    }

    // for unknown reason, when we let provider resolve gas limit automatically, it does not work
    // when we call estimation manually and use result it does work
    const gas = await (this.feedsContract as FeedContract).estimateGasForUpdate(props?.data as UmbrellaFeedsUpdateArgs);

    return {
      gasLimit: (gas.gasLimit * 15n) / 10n, // using limit that is 50% more than estimated just in case
    };
  }
}
