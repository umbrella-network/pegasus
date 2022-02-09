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
  readonly settings!: Settings;
  provider!: Provider;
  wallet!: Wallet;
  providersUrls!: string[];
  selectionStrategy!: string;

  constructor(@inject('Settings') settings: Settings) {
    this.settings = settings;
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
    const rpcSelector = new RPCSelector(this.providersUrls, {timeout: 1500, maxTimestampDiff: 60000});

    const provider =
      this.selectionStrategy === RPCSelectionStrategies.BY_BLOCK_NUMBER
        ? await rpcSelector.selectByLatestBlockNumber()
        : await rpcSelector.selectByTimestamp();

    this.provider = new JsonRpcProvider(provider);
    this.wallet = new Wallet(this.settings.blockchain.provider.privateKey, this.provider);
  }
}

export default Blockchain;
