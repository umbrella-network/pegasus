import {JsonRpcProvider, Provider} from '@ethersproject/providers';
import {RPCSelector} from '@umb-network/toolbox';
import {inject, injectable} from 'inversify';
import {Wallet} from 'ethers';
import {Logger} from 'winston';

import Settings from '../types/Settings';
import {RPCSelectionStrategies} from '../types/RPCSelectionStrategies';

@injectable()
class Blockchain {
  @inject('Logger') logger!: Logger;
  provider!: Provider;
  wallet!: Wallet;
  providersUrls!: string[];
  selectionStrategy!: string;

  constructor(@inject('Settings') settings: Settings) {
    this.provider = new JsonRpcProvider(settings.blockchain.provider.urls[0]);
    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
    this.providersUrls = settings.blockchain.provider.urls;
    this.selectionStrategy = settings.rpcSelectionStrategy;
  }

  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  async getBlockTimestamp(): Promise<number> {
    return (await this.provider.getBlock('latest')).timestamp;
  }

  async setLatestProvider(): Promise<void> {
    const rpcSelector = new RPCSelector(this.providersUrls);

    const provider =
      this.selectionStrategy === RPCSelectionStrategies.BY_BLOCK_NUMBER
        ? await rpcSelector.selectByLatestBlockNumber()
        : await rpcSelector.selectByTimestamp();

    this.provider = new JsonRpcProvider(provider);
  }
}

export default Blockchain;
