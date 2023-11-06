import {ChainsIds} from '../types/ChainsIds';
import {ProviderInterface} from '../interfaces/ProviderInterface';
import {EvmProvider} from '../blockchains/evm/EvmProvider';
import settings from '../config/settings';
import {MultiversXProvider} from '../blockchains/multiversx/MultiversXProvider';
import {MassaProvider} from '../blockchains/massa/MassaProvider';
// import {ConcordiumProvider} from '../blockchains/concordium/ConcordiumProvider';

export class ProviderFactory {
  static create(chainId: ChainsIds): ProviderInterface {
    const providerUrl = settings.blockchain.multiChains[chainId]?.providerUrl;

    if (!providerUrl) throw new Error(`[ProviderFactory] empty providerUrl for ${chainId}`);

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return new MultiversXProvider(providerUrl);

      case ChainsIds.MASSA:
        return new MassaProvider(providerUrl);

      // case ChainsIds.CONCORDIUM:
      //   return new ConcordiumProvider(providerUrl);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        return new EvmProvider(chainId, providerUrl);

      default:
        throw new Error(`[ProviderFactory] ${chainId} not supported`);
    }
  }
}
