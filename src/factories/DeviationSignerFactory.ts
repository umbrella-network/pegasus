import {injectable} from 'inversify';

import {ChainsIds} from '../types/ChainsIds';
import {DeviationSignerEvm} from '../blockchains/evm/DeviationSignerEvm';
import {DeviationSignerMultiversX} from '../blockchains/multiversx/DeviationSignerMultiversX';
import {DeviationSignerInterface} from '../services/deviationsFeeds/interfaces/DeviationSignerInterface';
import {DeviationSignerMassa} from '../blockchains/massa/DeviationSignerMassa';
import Settings from '../types/Settings';

@injectable()
export class DeviationSignerFactory {
  static create(settings: Settings, chainId: ChainsIds): DeviationSignerInterface {
    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return new DeviationSignerMultiversX(settings);

      case ChainsIds.MASSA:
        return new DeviationSignerMassa(settings);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return new DeviationSignerEvm(settings, chainId);

      default:
        throw new Error(`[DeviationSigner] ${chainId} not supported`);
    }
  }
}
