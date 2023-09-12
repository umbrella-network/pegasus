import {injectable} from 'inversify';

import {ChainsIds} from '../types/ChainsIds';
import {IProvider} from '../lib/providers/IProvider';
import {EvmProvider} from '../lib/providers/EvmProvider';
import settings from '../config/settings';
import {MultiversXProvider} from '../lib/providers/MultiversXProvider';

@injectable()
export class ProviderFactory {
  static create(chainId: ChainsIds): IProvider {
    const providerUrl = settings.blockchain.multiChains[chainId]?.providerUrl;

    if (!providerUrl) throw new Error(`[ProviderFactory] empty providerUrl for ${chainId}`);

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return new MultiversXProvider(providerUrl);

      default:
        return new EvmProvider(chainId, providerUrl);
    }
  }
}
