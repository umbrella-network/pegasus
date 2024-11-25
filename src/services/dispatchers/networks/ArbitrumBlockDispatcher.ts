import {injectable} from 'inversify';
import {GasEstimation} from '@umb-network/toolbox/dist/types/GasEstimation';
import {PayableOverrides} from '@ethersproject/contracts';

import {BlockDispatcher} from '../BlockDispatcher.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {ChainSubmitArgs} from '../../../types/ChainSubmit.js';
import {BlockchainType} from '../../../types/Settings.js';

@injectable()
export class ArbitrumBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.ARBITRUM;
  readonly blockchainType = BlockchainType.LAYER2;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    // for arbitrum we are only calculating gasLimit
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async calculatePayableOverrides(props?: {nonce?: bigint; data?: unknown}): Promise<PayableOverrides> {
    if (this.blockchain.chainSettings.transactions.useDefaultGasEstimation) return {};

    // for unknown reason, when we let provider resolve gas limit automatically, it does not work
    // when we call estimation manually and use result it does work
    const gas = await this.chainContract.estimateGasForSubmit(props?.data as ChainSubmitArgs);

    return {
      gasLimit: (gas * 15n) / 10n, // using limit that is 50% more than estimated just in case
    };
  }
}
