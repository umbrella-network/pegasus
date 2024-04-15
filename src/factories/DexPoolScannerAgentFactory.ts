import {DexProtocolName} from '../types/DexProtocolName.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DexPoolScannerAgent} from '../agents/DexPoolScannerAgent.js';

export class DexPoolScannerAgentFactory {
  static create(chainId: ChainsIds, dexProtocol: DexProtocolName): DexPoolScannerAgent {
    return new DexPoolScannerAgent(chainId, dexProtocol);
  }
}
