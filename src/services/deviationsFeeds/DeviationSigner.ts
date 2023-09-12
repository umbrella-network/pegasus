import {injectable} from 'inversify';

import {ChainsIds} from "../../types/ChainsIds";
import {DeviationSignerEvm} from "./evm/DeviationSignerEvm";
import {DeviationSignerMultiversX} from "./multiversX/DeviationSignerMultiversX";
import {DeviationSignerInterface} from "./interfaces/DeviationSignerInterface";
import {WalletFactory} from "../../factories/WalletFactory";

@injectable()
export class DeviationSigner implements DeviationSignerInterface {
  async apply(chainId: ChainsIds, dataHash: string): Promise<string> {
    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return DeviationSignerMultiversX.apply(WalletFactory.create(chainId).getRawWallet(), dataHash);

      default:
        return DeviationSignerEvm.apply(WalletFactory.create(chainId).getRawWallet(), dataHash);
    }
  }
}
