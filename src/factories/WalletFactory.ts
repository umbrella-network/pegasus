import {ChainsIds} from '../types/ChainsIds';
import settings from '../config/settings';
import {IWallet} from '../lib/wallets/IWallet';
import {EvmWallet} from '../lib/wallets/EvmWallet';
import {MultiversXWallet} from '../lib/wallets/MultiversXWallet';

export class WalletFactory {
  static create(chainId: ChainsIds): IWallet {
    const {wallets} = settings.blockchain;

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        if (!wallets.multiversX.privateKey) throw new Error(`[WalletFactory] empty privateKey for ${chainId}`);
        return new MultiversXWallet(wallets.multiversX.privateKey.split('\\n').join('\n'));

      default:
        if (!wallets.evm.privateKey) throw new Error(`[WalletFactory] empty privateKey for ${chainId}`);
        return new EvmWallet(chainId, wallets.evm.privateKey);
    }
  }
}
