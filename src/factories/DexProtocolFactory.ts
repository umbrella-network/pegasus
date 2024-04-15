import {injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

import {ChainsIds} from '../types/ChainsIds.js';
import {UniswapV3Factory} from '../blockchains/evm/contracts/UniswapV3Factory.js';
import Settings from '../types/Settings.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {DexProtocolInterface} from '../interfaces/DexProtocolInterface.js';

export type PoolCreatedEvent = {
  token0: string;
  token1: string;
  fee: bigint;
  pool: string;
  anchor: number;
};

@injectable()
export class DexProtocolFactory {
  static create(
    chainId: ChainsIds,
    dexProtocol: DexProtocolName,
    settings: Settings,
    provider: StaticJsonRpcProvider,
  ): DexProtocolInterface {
    switch (dexProtocol) {
      case DexProtocolName.UNISWAP_V3:
        return new UniswapV3Factory(chainId, settings, provider);
      default:
        throw new Error(`[DexProtocolFactory] ${dexProtocol} not supported`);
    }
  }
}
