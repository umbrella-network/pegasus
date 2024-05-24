import {StaticJsonRpcProvider} from '@ethersproject/providers';

import {DexProtocolName} from '../types/Dexes.js';
import {UniswapV3Helper} from '../services/fetcherHelper/contracts/UniswapV3Helper.js';
import {ContractHelperInterface} from '../services/fetcherHelper/interfaces/ContractHelperInterface.js';

export class ContractHelperFactory {
  static create(
    protocol: DexProtocolName,
    provider: StaticJsonRpcProvider,
    contractAddress: string,
  ): ContractHelperInterface {
    switch (protocol) {
      case DexProtocolName.UNISWAP_V3:
        return new UniswapV3Helper(provider, contractAddress);
      default:
        throw new Error(`[ContractHelperFactory] ${protocol} not supported`);
    }
  }
}
