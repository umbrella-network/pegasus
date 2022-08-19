import { BigNumber } from 'ethers';

export interface IWallet {
  readonly chainId: string;
  readonly address: string;
  getBalance(): Promise<BigNumber>;
}
