import {BlockchainSettings} from '../../types/Settings';
import {BigNumber} from 'ethers';
import {ChainsIds} from '../../types/ChainsIds';
import {IProvider} from '../providers/IProvider';
import {IWallet} from '../wallets/IWallet';
import {SolanaProvider} from '../providers/SolanaProvider';
import {SolanaWallet} from '../wallets/SolanaWallet';
import {IGenericBlockchain, GenericBlockchainProps} from './IGenericBlockchain';
import {LAMPORTS_PER_SOL} from '@solana/web3.js';

export class SolanaBlockchain implements IGenericBlockchain {
  readonly chainId = 'solana' as ChainsIds;
  readonly isMasterChain!: boolean;
  readonly settings!: BlockchainSettings;
  readonly provider!: IProvider;
  readonly wallet!: IWallet;

  constructor(props: GenericBlockchainProps) {
    const {chainId, settings} = props;
    this.isMasterChain = chainId === settings.blockchain.masterChain.chainId;
    this.settings = (<Record<string, BlockchainSettings>>settings.blockchain.multiChains)[chainId];

    if (!this.settings.providerUrl) {
      return;
    }

    this.provider = new SolanaProvider(props);

    this.wallet = new SolanaWallet({
      provider: (<SolanaProvider>this.provider).provider,
      settings: settings,
      wallet: (<SolanaProvider>this.provider).wallet,
    });
  }

  getProvider(): IProvider {
    return this.provider;
  }

  getWallet(): IWallet {
    return this.wallet;
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getLastNonce(): Promise<number> {
    return this.provider.getTransactionCount(this.wallet.address);
  }

  async balanceOf(address: string): Promise<BigNumber> {
    return this.provider.getBalance(address);
  }

  getContractRegistryAddress(): string {
    return '';
  }

  async getWalletBalance(): Promise<BigNumber> {
    return this.balanceOf(this.wallet.address);
  }

  toBaseCurrency(amount: number | string): BigNumber {
    if (typeof amount === 'number') {
      return BigNumber.from(amount * LAMPORTS_PER_SOL);
    }

    return BigNumber.from(Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL));
  }

  fromBaseCurrency(amount: number | string | BigNumber): number {
    if (typeof amount === 'string') {
      return parseFloat(amount) / LAMPORTS_PER_SOL;
    }

    if (BigNumber.isBigNumber(amount)) {
      return amount.toNumber() / LAMPORTS_PER_SOL;
    }

    return amount / LAMPORTS_PER_SOL;
  }

  containsNonceError(errorMessage: string): boolean {
    return (
      errorMessage.includes('stored nonce is still in recent_blockhashes') ||
      errorMessage.includes('specified nonce does not match stored nonce') ||
      errorMessage.includes('cannot handle request in current account state')
    );
  }
}
