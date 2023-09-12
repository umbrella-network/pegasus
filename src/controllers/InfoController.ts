import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import Settings, {BlockchainInfoSettings} from '../types/Settings';
import {TimeoutCodes} from '../types/TimeoutCodes';
import {LastSubmitResolver} from '../services/SubmitMonitor/LastSubmitResolver';
import {BlockchainRepository} from '../repositories/BlockchainRepository';
import {ChainsIds} from '../types/ChainsIds';
import {RegistryContractFactory} from '../factories/contracts/RegistryContractFactory';
import {Logger} from 'winston';
import {CHAIN_CONTRACT_NAME} from '@umb-network/toolbox/dist/constants';

@injectable()
class InfoController {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(LastSubmitResolver) lastSubmitResolver!: LastSubmitResolver;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  router: express.Router;

  constructor() {
    this.router = express.Router().get('/', this.info);
  }

  static obfuscate = (data: string | undefined): string => {
    if (!data) {
      return 'undefined';
    }

    return `${data.slice(0, 1)}***${data.slice(-1)}`.toLowerCase();
  };

  info = async (request: Request, response: Response): Promise<void> => {
    if (this.isPing(request)) {
      this.logger.info('ping');

      response.send({
        status: 'alive',
        version: this.settings.version,
      });
      return;
    }

    response.send({
      feedsOnChain: this.settings.feedsOnChain,
      feedsFile: this.settings.feedsFile,
      deviationFeedsFile: this.settings.deviationTrigger.feedsFile,
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      uniswap: {
        helperContractId: this.settings.api.uniswap.helperContractId,
        scannerContractId: this.settings.api.uniswap.scannerContractId,
      },
      masterChain: await this.getMasterchainSettings(),
      chains: await this.getMultichainsSettings(),
      version: this.settings.version,
      environment: this.settings.environment,
      name: this.settings.name,
      keys: {
        cryptocompare: InfoController.obfuscate(this.settings.api.cryptocompare.apiKey),
        polygonIO: InfoController.obfuscate(this.settings.api.polygonIO.apiKey),
        options: InfoController.obfuscate(this.settings.api.optionsPrice.apiKey),
      },
      timeoutCodes: this.getFormattedTimeoutCodes(),
    });
  };

  private isPing = (request: Request): boolean => {
    return !request.query.details;
  };

  private getFormattedTimeoutCodes = () => {
    const formattedTimeoutCodes: {[key: string]: number} = {};

    for (const enumValue in TimeoutCodes) {
      if (isNaN(Number(enumValue))) {
        formattedTimeoutCodes[enumValue] = Number(TimeoutCodes[enumValue]);
      }
    }

    return formattedTimeoutCodes;
  };

  private getChainSettings = async (chainId: ChainsIds): Promise<BlockchainInfoSettings | undefined> => {
    const blockchain = this.blockchainRepository.get(chainId);
    if (!blockchain) return;

    const registry = RegistryContractFactory.create(blockchain);

    const [chainAddress, umbrellaFeedsAddress, walletAddress, deviationWalletAddress] = await Promise.allSettled([
      registry.getAddress(CHAIN_CONTRACT_NAME),
      registry.getAddress('UmbrellaFeeds'),
      blockchain.wallet.address,
      blockchain.deviationWallet?.address,
    ]);

    return <BlockchainInfoSettings>{
      chainId,
      contractRegistryAddress: this.settings.blockchain.multiChains[chainId]?.contractRegistryAddress,
      providerUrl: this.settings.blockchain.multiChains[chainId]?.providerUrl?.split('/').slice(0, 3).join('/'),
      lastTx: await this.lastSubmitResolver.apply(chainId),
      chainAddress: this.getPromiseResult(chainAddress),
      deviationWalletAddress: this.getPromiseResult(deviationWalletAddress),
      walletAddress: this.getPromiseResult(walletAddress),
      umbrellaFeedsAddress: this.getPromiseResult(umbrellaFeedsAddress),
    };
  };

  protected getPromiseResult(a: PromiseSettledResult<string | undefined>): string {
    return a.status == 'fulfilled' ? a.value || '' : a.reason;
  }

  private getMasterchainSettings = async (): Promise<Partial<Record<ChainsIds, BlockchainInfoSettings>>> => {
    const masterChainSettings: Partial<Record<ChainsIds, BlockchainInfoSettings>> = {};
    const {chainId} = this.settings.blockchain.masterChain;

    masterChainSettings[chainId] = await this.getChainSettings(chainId);

    return masterChainSettings;
  };

  private getMultichainsSettings = async (): Promise<Record<string, BlockchainInfoSettings>> => {
    const chainIds = Object.values(ChainsIds);

    const cfg = await Promise.all(
      chainIds
        .filter((key) => key !== this.settings.blockchain.masterChain.chainId)
        .map((chainId) => Promise.all([chainId, this.getChainSettings(chainId as ChainsIds)])),
    );

    return cfg.reduce((acc, [chainId, s]) => {
      if (!s) return acc;
      acc[chainId] = s;
      return acc;
    }, {} as Record<string, BlockchainInfoSettings>);
  };
}

export default InfoController;
