import {JsonRpcProvider, Provider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Wallet} from 'ethers';
import {Logger} from 'winston';

import Settings from '../types/Settings';
import RPCSelector from '../services/RPCSelector';

@injectable()
class Blockchain {
  @inject(RPCSelector) rpcSelector!: RPCSelector;
  @inject('Logger') logger!: Logger;
  provider!: Provider;
  wallet!: Wallet;

  constructor(@inject('Settings') settings: Settings) {
    this.provider = new JsonRpcProvider(settings.blockchain.provider.urls[0]);
    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getBlockTimestamp(): Promise<number> {
    return (await this.provider.getBlock('latest')).timestamp;
  }

  async setLatestProvider(): Promise<void> {
    const provider = await this.rpcSelector.apply();
    this.provider = new JsonRpcProvider(provider);
  }
}

export default Blockchain;
