import { Provider } from '@ethersproject/providers';
import { inject, injectable } from 'inversify';
import Settings from '../types/Settings';
import { ethers, Wallet } from 'ethers';

@injectable()
class Blockchain {
  provider: Provider;
  wallet: Wallet;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.provider = ethers.providers.getDefaultProvider(settings.blockchain.provider.url);
    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
  }
}

export default Blockchain;
