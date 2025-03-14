import {ChainsIds} from '../types/ChainsIds.js';
import {ProviderInterface} from '../interfaces/ProviderInterface.js';
import {EvmProvider} from '../blockchains/evm/EvmProvider.js';
import settings from '../config/settings.js';
import {MultiversXProvider} from '../blockchains/multiversx/MultiversXProvider.js';
import {MassaProvider} from '../blockchains/massa/MassaProvider.js';
import {ConcordiumProvider} from '../blockchains/concordium/ConcordiumProvider.js';

export class ProviderFactory {
  static create(chainId: ChainsIds): ProviderInterface {
    const providerUrl = settings.blockchain.multiChains[chainId]?.providerUrl;
    let blockchainId;

    if (!providerUrl) throw new Error(`[ProviderFactory] empty providerUrl for ${chainId}`);

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        return new MultiversXProvider(providerUrl);

      case ChainsIds.MASSA:
        blockchainId = settings.blockchain.multiChains[chainId]?.blockchainId;
        if (!blockchainId) throw new Error(`[ProviderFactory] empty chainId for ${chainId}`);

        return new MassaProvider(providerUrl, BigInt(blockchainId));

      case ChainsIds.CONCORDIUM:
        return new ConcordiumProvider(providerUrl);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
      case ChainsIds.AVAX_MELD:
      case ChainsIds.XDC:
      case ChainsIds.OKX:
      case ChainsIds.ARTHERA:
      case ChainsIds.ASTAR:
      case ChainsIds.ROOTSTOCK:
      case ChainsIds.ZK_LINK_NOVA:
      case ChainsIds.BOB:
      case ChainsIds._5IRE:
        return new EvmProvider(chainId, providerUrl);

      default:
        throw new Error(`[ProviderFactory] ${chainId} not supported`);
    }
  }
}
