import {JsonRpcProvider, Provider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Wallet} from 'ethers';

import Settings from '../types/Settings';

@injectable()
class Blockchain {
  provider: Provider;
  wallet: Wallet;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.provider = this.getProvider(settings.blockchain.provider.url);
    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
  }

  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  getProvider(url: string): JsonRpcProvider {
    const match = url.match(/^(http)s?:/i);
    if (match && match[1] === 'http') {
      return new JsonRpcProvider(url);
    }

    throw new Error(`unsupported URL scheme: ${url}. Please switch to http(s)`)
  }
}

export default Blockchain;
