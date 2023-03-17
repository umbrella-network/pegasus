import {injectable} from 'inversify';
import {BlockDispatcher} from './BlockDispatcher';
import {ChainsIds} from '../../types/ChainsIds';
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";
import {PayableOverrides} from "@ethersproject/contracts";
import {ChainSubmitArgs} from "../../types/ChainSubmit";

@injectable()
export class ArbitrumBlockDispatcher extends BlockDispatcher {
  readonly chainId = ChainsIds.ARBITRUM;

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    // for arbitrum we are only calculating gasLimit
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected async calculatePayableOverrides(data: ChainSubmitArgs, nonce?: number): Promise<PayableOverrides> {
    // for unknown reason, when we let provider resolve gas limit automatically, it does not work 
    // when we call estimation manually and use result it does work
    const gas = await this.chainContract.estimateGasForSubmit(data);

    return {
      gasLimit: gas.mul(15).div(10) // using limit that is 50% more than estimated just in case
    };
  }
}
