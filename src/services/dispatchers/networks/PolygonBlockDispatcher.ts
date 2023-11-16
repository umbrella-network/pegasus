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
    // for unknown reason, when we let provider resolve gas limit automatically, it does not work
    // when we call estimation manually and use result it does work
    const gas = await this.chainContract.estimateGasForSubmit(props?.data as ChainSubmitArgs);

    return {
      gasLimit: (gas * 15n) / 10n, // using limit that is 50% more than estimated just in case
    };
  }
}
