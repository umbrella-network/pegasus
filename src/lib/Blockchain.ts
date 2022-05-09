import {Provider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Wallet, providers} from 'ethers';
import {Logger} from 'winston';

import Settings from '../types/Settings';

@injectable()
class Blockchain {
  @inject('Logger') logger!: Logger;
  readonly settings!: Settings;
  provider!: Provider;
  wallet!: Wallet;

  constructor(@inject('Settings') settings: Settings) {
    this.settings = settings;
    this.provider = new providers.FallbackProvider(
      settings.blockchain.provider.urls.map((url) => providers.getDefaultProvider(url)),
    );
    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getBlockTimestamp(): Promise<number> {
    return (await this.provider.getBlock('latest')).timestamp;
  }
}

export default Blockchain;
