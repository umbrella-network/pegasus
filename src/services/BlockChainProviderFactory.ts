import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {getDefaultProvider, Provider} from '@ethersproject/providers';

@injectable()
class BlockChainProviderFactory {
  @inject('Settings') settings!: Settings;

  providers: {[name: string]: Provider} = {};

  apply(name: string): Provider {
    const url = this.settings.blockchain.providers[name];
    if (!url) {
      throw new Error(`No blockchain provider found for ${name}`);
    }

    if (!this.providers[name]) {
      this.providers[name] = getDefaultProvider(url);
    }

    return this.providers[name];
  }
}

export default BlockChainProviderFactory;
