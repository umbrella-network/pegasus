import {injectable} from 'inversify';
import {BlockDispatcher} from '../BlockDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {BlockchainType} from '../../../types/Settings.js';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {PayableOverrides} from '@ethersproject/contracts';
import {ChainSubmitArgs} from '../../../types/ChainSubmit';

@injectable()
export class PolygonBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.POLYGON;
  readonly blockchainType = BlockchainType.LAYER2;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    // for arbitrum we are only calculating gasLimit
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const gas = await this.chainContract.estimateGasForSubmit(props?.data as ChainSubmitArgs);

    return {
      gasLimit: (gas * 11n) / 100n, // using limit that is 10% more than estimated just in case
    };
  }
}
