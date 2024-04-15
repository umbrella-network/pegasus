import {DexProtocolName} from '../types/DexProtocolName.js';
import {DexPoolScanner} from '../services/DexPoolScanner.js';
import {ChainsIds} from '../types/ChainsIds.js';

export class DexPoolScannerFactory {
  static create(chainId: ChainsIds, dexProtocol: DexProtocolName): DexPoolScanner {
    return new DexPoolScanner(chainId, dexProtocol);
  }
}
