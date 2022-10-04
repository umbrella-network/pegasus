import {BigNumber} from 'ethers';
import {IProvider} from '../providers/IProvider';
import {IWallet} from '../wallets/IWallet';
import {ChainsIds} from '../../types/ChainsIds';
import Settings from '../../types/Settings';

export interface GenericBlockchainProps {
  chainId: ChainsIds;
  settings: Settings;
}

export interface IGenericBlockchain {
  readonly chainId: ChainsIds;
  readonly wallet: IWallet;
  readonly provider: IProvider;
  getProvider(): IProvider;
  getWallet(): IWallet;
  getLastNonce(): Promise<number>;
  getBlockNumber(): Promise<number>;
  balanceOf(address: string): Promise<BigNumber>;
  getContractRegistryAddress(): string;
  getWalletBalance(): Promise<BigNumber>;
  toBaseCurrency(amount: number | string): BigNumber;
  fromBaseCurrency(amount: number | string | BigNumber): number;
  containsNonceError(errorMessage: string): boolean;
}
