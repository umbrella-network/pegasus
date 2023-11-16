import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import Settings, {BlockchainInfoSettings} from '../types/Settings.js';
import {TimeoutCodes} from '../types/TimeoutCodes.js';
import {LastSubmitResolver} from '../services/SubmitMonitor/LastSubmitResolver.js';
import {BlockchainRepository} from '../repositories/BlockchainRepository.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {RegistryContractFactory} from '../factories/contracts/RegistryContractFactory.js';
import {Logger} from 'winston';
import {CHAIN_CONTRACT_NAME} from '@umb-network/toolbox/dist/constants.js';
import {SubmitMonitor} from '../types/SubmitMonitor.js';

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
      chains: await this.getMultichainsSettings(this.getChain(request)),
      version: this.settings.version,
      environment: this.settings.environment,
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

  private getChain = (request: Request): ChainsIds | undefined => {
    if (!request.query.details) return;

    return Object.values(ChainsIds).includes(`${request.query.details}` as ChainsIds)
      ? (request.query.details as ChainsIds)
      : undefined;
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

    const [chainAddress, umbrellaFeedsAddress, walletAddress, deviationWalletAddress, lastTxResolved] =
      await Promise.allSettled([
        registry.getAddress(CHAIN_CONTRACT_NAME),
        registry.getAddress('UmbrellaFeeds'),
        blockchain.wallet.address,
        blockchain.deviationWallet?.address,
        this.lastSubmitResolver.apply(chainId),
      ]);

    const lastTx = this.getPromiseResult<SubmitMonitor | undefined>(lastTxResolved);

    return <BlockchainInfoSettings>{
      chainId,
      contractRegistryAddress: this.settings.blockchain.multiChains[chainId]?.contractRegistryAddress,
      providerUrl: this.settings.blockchain.multiChains[chainId]?.providerUrl?.split('/').slice(0, 3).join('/'),
      lastTx: lastTx ? {...lastTx, date: new Date(lastTx.dataTimestamp * 1000).toUTCString()} : undefined,
      chainAddress: this.getPromiseResult(chainAddress),
      deviationWalletAddress: this.getPromiseResult(deviationWalletAddress),
      walletAddress: this.getPromiseResult(walletAddress),
      umbrellaFeedsAddress: this.getPromiseResult(umbrellaFeedsAddress),
    };
  };

  protected getPromiseResult<T>(a: PromiseSettledResult<T | undefined>): T {
    return a.status == 'fulfilled' ? a.value : a.reason;
  }

  private getMultichainsSettings = async (
    forChain: ChainsIds | undefined,
  ): Promise<Record<string, BlockchainInfoSettings>> => {
    const chainIds = forChain ? [forChain] : Object.values(ChainsIds);

    const cfg = await Promise.all(
      chainIds.map((chainId) => Promise.all([chainId, this.getChainSettings(chainId as ChainsIds)])),
    );

    return cfg.reduce(
      (acc, [chainId, s]) => {
        if (!s) return acc;
        acc[chainId] = s;
        return acc;
      },
      {} as Record<string, BlockchainInfoSettings>,
    );
  };
}

export default InfoController;
