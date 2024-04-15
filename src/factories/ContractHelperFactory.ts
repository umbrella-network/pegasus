import {injectable} from 'inversify';

import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {ContractHelper} from '../services/fetcherHelper/contracts/ContractHelper.js';
import {ContractHelperInterface} from '../services/fetcherHelper/interfaces/ContractHelperInterface.js';

@injectable()
export class ContractHelperFactory {
  static create(chainId: ChainsIds, dexProtocol: DexProtocolName): ContractHelperInterface {
    switch (dexProtocol) {
      case DexProtocolName.UNISWAP_V3: {
        const nameABI = 'uniswapV3Helper';
        return new ContractHelper(chainId, nameABI);
      }
      default:
        throw new Error(`[ContractHelper] ${chainId} not supported`);
    }
  }
}
