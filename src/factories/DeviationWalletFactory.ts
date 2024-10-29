import {ChainsIds} from '../types/ChainsIds.js';
import Settings from '../types/Settings.js';
import {IWallet} from '../interfaces/IWallet.js';
import {EvmWallet} from '../blockchains/evm/EvmWallet.js';
import {MultiversXWallet} from '../blockchains/multiversx/MultiversXWallet.js';
import {MassaWallet} from '../blockchains/massa/MassaWallet.js';
import {ConcordiumWallet} from '../blockchains/concordium/ConcordiumWallet.js';

export class DeviationWalletFactory {
  static create(settings: Settings, chainId: ChainsIds): IWallet | undefined {
    const {wallets} = settings.blockchain;

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        if (!wallets.multiversX.deviationPrivateKey) return;
        return new MultiversXWallet(wallets.multiversX.deviationPrivateKey.split('\n').join('\n'));

      case ChainsIds.MASSA:
        if (!wallets.massa.deviationPrivateKey) return;
        return new MassaWallet(wallets.massa.deviationPrivateKey, true);

      case ChainsIds.CONCORDIUM:
        if (!wallets.concordium.deviationPrivateKey) return;
        return new ConcordiumWallet(wallets.concordium.deviationPrivateKey);

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
        if (!wallets.evm.deviationPrivateKey) return;
        return new EvmWallet(chainId, wallets.evm.deviationPrivateKey);

      default:
        throw new Error(`[DeviationWalletFactory] ${chainId} not supported`);
    }
  }
}
