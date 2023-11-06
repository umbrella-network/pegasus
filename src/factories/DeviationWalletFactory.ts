import {ChainsIds} from '../types/ChainsIds';
import settings from '../config/settings';
import {IWallet} from '../interfaces/IWallet';
import {EvmWallet} from '../blockchains/evm/EvmWallet';
import {MultiversXWallet} from '../blockchains/multiversx/MultiversXWallet';
import {MassaWallet} from '../blockchains/massa/MassaWallet';
// import {ConcordiumWallet} from '../blockchains/concordium/ConcordiumWallet';

export class DeviationWalletFactory {
  static create(chainId: ChainsIds): IWallet | undefined {
    const {wallets} = settings.blockchain;

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        if (!wallets.multiversX.deviationPrivateKey) return;
        return new MultiversXWallet(wallets.multiversX.deviationPrivateKey.split('\n').join('\n'));

      case ChainsIds.MASSA:
        if (!wallets.massa.deviationPrivateKey) return;
        return new MassaWallet(wallets.massa.deviationPrivateKey);

      // case ChainsIds.CONCORDIUM:
      //   if (!wallets.concordium.deviationPrivateKey) return;
      //   return new ConcordiumWallet(wallets.concordium.deviationPrivateKey);

      case ChainsIds.BSC:
      case ChainsIds.AVALANCHE:
      case ChainsIds.ARBITRUM:
      case ChainsIds.POLYGON:
      case ChainsIds.ETH:
      case ChainsIds.LINEA:
      case ChainsIds.BASE:
        if (!wallets.evm.deviationPrivateKey) return;
        return new EvmWallet(chainId, wallets.evm.deviationPrivateKey);

      default:
        throw new Error(`[DeviationWalletFactory] ${chainId} not supported`);
    }
  }
}
