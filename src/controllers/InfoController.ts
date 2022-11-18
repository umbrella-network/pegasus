import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import Settings, {BlockchainInfoSettings, BlockchainSettings} from '../types/Settings';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import {TimeoutCodes} from '../types/TimeoutCodes';
import {ChainsIds} from '../types/ChainsIds';

@injectable()
class InfoController {
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
    const [validatorP, chainContractP, networkP] = await Promise.allSettled([
      this.blockchain.wallet.getAddress(),
      this.chainContract.resolveAddress(),
      this.blockchain.provider.getNetwork(),
    ]);

    const validatorAddress = validatorP.status === 'fulfilled' ? validatorP.value : validatorP.reason;
    const chainContractAddress = chainContractP.status === 'fulfilled' ? chainContractP.value : chainContractP.reason;
    const network = networkP.status === 'fulfilled' ? networkP.value : networkP.reason;

    response.send({
      feedsOnChain: this.settings.feedsOnChain,
      feedsFile: this.settings.feedsFile,
      validator: validatorAddress,
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      chainContractAddress: chainContractAddress,
      uniswap: {
        helperContractId: this.settings.api.uniswap.helperContractId,
        scannerContractId: this.settings.api.uniswap.scannerContractId,
      },
      masterChain: this.getMasterchainSettings(),
      chains: this.getMultichainsSettings(),
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

  private getMasterchainSettings = (): Partial<Record<ChainsIds, BlockchainInfoSettings>> => {
    const masterChainSettings: Partial<Record<ChainsIds, BlockchainInfoSettings>> = {};

    masterChainSettings[this.settings.blockchain.masterChain.chainId] = {
      contractRegistryAddress: this.settings.blockchain.contracts.registry.address,
      providerUrl: this.settings.blockchain.provider.urls[0]?.substring(0, 30),
    };

    return masterChainSettings;
  };

  private getMultichainsSettings = (): Partial<Record<ChainsIds, BlockchainInfoSettings>> => {
    const chainSettings: Partial<Record<ChainsIds, BlockchainInfoSettings>> = {};
    const chainEntries = Object.entries(this.settings.blockchain.multiChains) as [ChainsIds, BlockchainSettings][];

    chainEntries
      .filter(([key]) => key !== this.settings.blockchain.masterChain.chainId)
      .map<void>((chain) => {
        chainSettings[chain[0]] = {
          contractRegistryAddress: chain[1].contractRegistryAddress,
          providerUrl: chain[1]?.providerUrl?.substring(0, 30),
        };
      });

    return chainSettings;
  };
}

export default InfoController;
