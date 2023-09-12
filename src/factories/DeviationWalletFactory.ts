import {ChainsIds} from '../types/ChainsIds';
import settings from '../config/settings';
import {IWallet} from '../lib/wallets/IWallet';
import {EvmWallet} from '../lib/wallets/EvmWallet';
import {MultiversXWallet} from '../lib/wallets/MultiversXWallet';

export class DeviationWalletFactory {
  static create(chainId: ChainsIds): IWallet | undefined {
    const {wallets} = settings.blockchain;

    switch (chainId) {
      case ChainsIds.MULTIVERSX:
        if (!wallets.multiversX.deviationPrivateKey) return;
        return new MultiversXWallet(wallets.multiversX.deviationPrivateKey.split('\n').join('\n'));

      default:
        if (!wallets.evm.deviationPrivateKey) return;
        return new EvmWallet(chainId, wallets.evm.deviationPrivateKey);
    }
  }
}
