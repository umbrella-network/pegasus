import {Logger} from 'winston';

import Settings, {BlockchainSettings} from '../types/Settings';
import {ProviderInterface} from '../interfaces/ProviderInterface';
import {IWallet} from '../interfaces/IWallet';
import {ProviderFactory} from '../factories/ProviderFactory';
import {WalletFactory} from '../factories/WalletFactory';
import {DeviationWalletFactory} from '../factories/DeviationWalletFactory';
import {ChainsIds} from '../types/ChainsIds';
import logger from './logger';

class Blockchain {
  protected logger!: Logger;
  readonly chainId!: string;
  chainSettings!: BlockchainSettings;
  readonly provider!: ProviderInterface;
  wallet!: IWallet;
  readonly deviationWallet: IWallet | undefined;
  protected selectionStrategy!: string;

  constructor(settings: Settings, chainId: ChainsIds | undefined = undefined) {
    this.logger = logger;
    if (!chainId) return;

    this.chainId = chainId;
    this.chainSettings = (<Record<string, BlockchainSettings>>settings.blockchain.multiChains)[chainId];
    if (!this.chainSettings) return;

    this.provider = ProviderFactory.create(chainId);
    this.wallet = WalletFactory.create(settings, chainId);
    this.deviationWallet = DeviationWalletFactory.create(chainId);

    this.selectionStrategy = settings.rpcSelectionStrategy;
  }

  async getBlockNumber(): Promise<bigint> {
    return this.provider.getBlockNumber();
  }

  async networkId(): Promise<number> {
    const network = await this.provider.getNetwork();
    return network.id;
  }

  async getBlockTimestamp(): Promise<number> {
    return this.provider.getBlockTimestamp();
  }

  getProvider(): ProviderInterface {
    return this.provider;
  }

  getContractRegistryAddress(): string {
    if (!this.chainSettings.contractRegistryAddress) {
      throw new Error(`[${this.chainId}] No contract registry address set`);
    }

    return this.chainSettings.contractRegistryAddress;
  }
}

export default Blockchain;
