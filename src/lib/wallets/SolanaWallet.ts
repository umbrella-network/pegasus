import Settings, {BlockchainSettings} from '../../types/Settings';
import {ChainsIds} from '../../types/ChainsIds';
import {IWallet} from './IWallet';
import {BigNumber} from 'ethers';
import {Provider, Wallet} from '@project-serum/anchor';

export interface SolanaWalletProps {
  provider: Provider;
  settings: Settings;
  wallet: Wallet;
}

export class SolanaWallet implements IWallet {
  readonly chainId = 'solana' as ChainsIds;
  readonly settings!: BlockchainSettings;
  readonly provider!: Provider;
  readonly wallet!: Wallet;
  readonly address!: string;

  constructor(props: SolanaWalletProps) {
    const {provider, settings, wallet} = props;
    this.provider = provider;
    this.settings = settings.blockchain.multiChains?.[this.chainId];
    this.wallet = wallet;
    this.address = this.wallet.publicKey.toBase58();
  }

  async getBalance(): Promise<BigNumber> {
    const balance = await this.provider.connection.getBalance(this.wallet.publicKey);

    if (balance) {
      return BigNumber.from(balance);
    }

    return BigNumber.from(0);
  }
}
