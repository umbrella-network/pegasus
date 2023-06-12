import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import Settings, {BlockchainInfoSettings, BlockchainSettings} from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import {TimeoutCodes} from '../types/TimeoutCodes';
import {ChainsIds} from 'src/types/ChainsIds';
import {LastSubmitResolver} from '../services/SubmitMonitor/LastSubmitResolver';

@injectable()
class InfoController {
  @inject(LastSubmitResolver) lastSubmitResolver!: LastSubmitResolver;

  router: express.Router;
  blockchain!: Blockchain;

  constructor(
    @inject('Settings') private readonly settings: Settings,
    @inject(ChainContract) private readonly chainContract: ChainContract,
    @inject(Blockchain) blockchain: Blockchain,
  ) {
    this.router = express.Router().get('/', this.info);
    this.blockchain = blockchain;
  }

  static obfuscate = (data: string | undefined): string => {
    if (!data) {
      return 'undefined';
    }

    return `${data.slice(0, 1)}***${data.slice(-1)}`.toLowerCase();
  };

  info = async (request: Request, response: Response): Promise<void> => {
    const [validatorP, deviationDispatcher, chainContractP, networkP] = await Promise.allSettled([
      this.blockchain.wallet.getAddress(),
      this.blockchain.deviationWallet?.getAddress(),
      this.chainContract.resolveAddress(),
      this.blockchain.provider.getNetwork(),
    ]);

    const validatorAddress = validatorP.status === 'fulfilled' ? validatorP.value : validatorP.reason;
    const chainContractAddress = chainContractP.status === 'fulfilled' ? chainContractP.value : chainContractP.reason;
    const network = networkP.status === 'fulfilled' ? networkP.value : networkP.reason;

    response.send({
      feedsOnChain: this.settings.feedsOnChain,
      feedsFile: this.settings.feedsFile,
      deviationFeedsFile: this.settings.deviationTrigger.feedsFile,
      validator: validatorAddress,
      deviationDispatcher: deviationDispatcher.status == 'fulfilled' ? deviationDispatcher?.value : undefined,
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      chainContractAddress: chainContractAddress,
      uniswap: {
        helperContractId: this.settings.api.uniswap.helperContractId,
        scannerContractId: this.settings.api.uniswap.scannerContractId,
      },
      masterChain: await this.getMasterchainSettings(),
      chains: await this.getMultichainsSettings(),
      version: this.settings.version,
      environment: this.settings.environment,
      network,
      name: this.settings.name,
      keys: {
        cryptocompare: InfoController.obfuscate(this.settings.api.cryptocompare.apiKey),
        polygonIO: InfoController.obfuscate(this.settings.api.polygonIO.apiKey),
        options: InfoController.obfuscate(this.settings.api.optionsPrice.apiKey),
      },
      timeoutCodes: this.getFormattedTimeoutCodes(),
    });
  };

  private getFormattedTimeoutCodes = () => {
    const formattedTimeoutCodes: {[key: string]: number} = {};

    for (const enumValue in TimeoutCodes) {
      if (isNaN(Number(enumValue))) {
        formattedTimeoutCodes[String(enumValue)] = Number(TimeoutCodes[enumValue]);
      }
    }

    return formattedTimeoutCodes;
  };

  private getChainSettings = async (chainId: ChainsIds): Promise<BlockchainInfoSettings> => {
    return {
      chainId,
      contractRegistryAddress: this.settings.blockchain.multiChains[chainId]?.contractRegistryAddress,
      providerUrl: this.settings.blockchain.multiChains[chainId]?.providerUrl?.split('/').slice(0, 3).join('/'),
      lastTx: await this.lastSubmitResolver.apply(chainId),
    };
  };

  private getMasterchainSettings = async (): Promise<Partial<Record<ChainsIds, BlockchainInfoSettings>>> => {
    const masterChainSettings: Partial<Record<ChainsIds, BlockchainInfoSettings>> = {};
    const {chainId} = this.settings.blockchain.masterChain;

    masterChainSettings[chainId] = await this.getChainSettings(chainId);

    return masterChainSettings;
  };

  private getMultichainsSettings = async (): Promise<Partial<Record<ChainsIds, BlockchainInfoSettings>>> => {
    const chainEntries = Object.entries(this.settings.blockchain.multiChains) as [ChainsIds, BlockchainSettings][];

    return <Partial<Record<ChainsIds, BlockchainInfoSettings>>>(
      Promise.all(
        chainEntries
          .filter(([key]) => key !== this.settings.blockchain.masterChain.chainId)
          .map(([chainId]) => this.getChainSettings(chainId)),
      )
    );
  };
}

export default InfoController;
