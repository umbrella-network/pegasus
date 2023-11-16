import {ChainsIds} from '../types/ChainsIds.js';
import {IWallet} from '../interfaces/IWallet.js';
import {EvmWallet} from '../blockchains/evm/EvmWallet.js';
import {MultiversXWallet} from '../blockchains/multiversx/MultiversXWallet.js';
import {MassaWallet} from '../blockchains/massa/MassaWallet.js';
import Settings from '../types/Settings.js';

export class WalletFactory {
  static create(settings: Settings, chainId: ChainsIds): IWallet {
    const {wallets} = settings.blockchain;

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        if (!wallets.multiversX.privateKey) throw new Error(`[WalletFactory] empty privateKey for ${chainId}`);
        return new MultiversXWallet(wallets.multiversX.privateKey);

      case ChainsIds.MASSA:
        if (!wallets.massa.privateKey) throw new Error(`[WalletFactory] empty privateKey for ${chainId}`);
        return new MassaWallet(wallets.massa.privateKey);

      case ChainsIds.CONCORDIUM:
        if (!wallets.evm.privateKey) throw new Error(`[WalletFactory] empty privateKey for ${chainId}`);
        return new MassaWallet(wallets.massa.privateKey);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        if (!wallets.evm.privateKey) throw new Error(`[WalletFactory] empty privateKey for ${chainId}`);
        return new EvmWallet(chainId, wallets.evm.privateKey);

      default:
        throw new Error(`[WalletFactory] ${chainId} not supported`);
    }
  }
}
