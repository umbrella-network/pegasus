import {JsonRpcProvider, Provider} from '@ethersproject/providers';
import {RPCSelector} from '@umb-network/toolbox';
import {inject, injectable} from 'inversify';
import {ethers, Wallet} from 'ethers';
import {Logger} from 'winston';

import Settings, {BlockchainSettings} from '../types/Settings';
import {RPCSelectionStrategies} from '../types/RPCSelectionStrategies';

export type BlockchainProps = {
  chainId: string;
  settings: Settings;
};

@injectable()
class Blockchain {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  readonly chainId!: string;
  readonly chainSettings!: BlockchainSettings;
  readonly isMasterChain!: boolean;
  provider!: Provider;
  wallet!: Wallet;
  providersUrls!: string[];
  selectionStrategy!: string;

  constructor(@inject('Settings') settings: Settings, chainId = settings.blockchain.masterChain.chainId) {
    this.chainId = chainId;
    this.isMasterChain = chainId === settings.blockchain.masterChain.chainId;
    this.chainSettings = (<Record<string, BlockchainSettings>>settings.blockchain.multiChains)[chainId];
    this.providersUrls = settings.blockchain.provider.urls;

    if (this.isMasterChain) {
      this.constructProvider();
    } else {
      this.provider = ethers.providers.getDefaultProvider(this.chainSettings.providerUrl);
    }

    this.wallet = new Wallet(settings.blockchain.provider.privateKey, this.provider);
    this.selectionStrategy = settings.rpcSelectionStrategy;
  }

  private constructProvider() {
    for (const url of this.providersUrls) {
      try {
        this.provider = new JsonRpcProvider(url);
        break;
      } catch (err) {
        this.logger.info(`[Blockchain] Failed to instantiate ${url}. ${err}.`);
      }
    }

    if (!this.provider) {
      this.provider = new JsonRpcProvider(this.providersUrls[0]);
    }
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

  getProvider(): Provider {
    return this.provider;
  }

  getContractRegistryAddress(): string {
    return this.chainSettings.contractRegistryAddress;
  }
}

export default Blockchain;
