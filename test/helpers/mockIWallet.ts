import {Wallet} from 'ethers';
import {IWallet} from '../../src/interfaces/IWallet.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';

export function mockIWallet(wallet: Wallet, chainId = ChainsIds.BSC): IWallet {
  return {
    address: wallet.address,
    chainId,
    rawWallet: wallet,
    getRawWallet: () => wallet,
  } as unknown as IWallet;
}
