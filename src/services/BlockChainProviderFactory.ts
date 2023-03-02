import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

@injectable()
class BlockChainProviderFactory {
  @inject('Settings') settings!: Settings;

  providers: {[name: string]: StaticJsonRpcProvider} = {};

  apply(name: string): StaticJsonRpcProvider {
    const url = this.settings.blockchain.providers[name];
    if (!url) {
      throw new Error(`No blockchain provider found for ${name}`);
    }

    if (!this.providers[name]) {
      this.providers[name] = new StaticJsonRpcProvider(url);
    }

    return this.providers[name];
  }
}

export default BlockChainProviderFactory;
