import {injectable} from 'inversify';
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
import {PayableOverrides} from "@ethersproject/contracts";

import {BlockDispatcher} from './BlockDispatcher';
import {ChainsIds} from '../../types/ChainsIds';

@injectable()
export class AvalancheBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.AVALANCHE;

  protected calculatePayableOverrides(gasMetrics: GasEstimation, nonce?: number): PayableOverrides {
    this.logger.info('[AvalancheBlockDispatcher] using individual gas settings');
    return {type: 2, nonce, gasPrice: gasMetrics.gasPrice};
  }
}
