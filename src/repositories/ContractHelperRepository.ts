import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {StaticJsonRpcProvider} from '@ethersproject/providers';

import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {ContractHelperFactory} from '../factories/ContractHelperFactory.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {ContractHelperInterface} from '../services/fetcherHelper/interfaces/ContractHelperInterface.js';
import {BlockchainProviderRepository} from './BlockchainProviderRepository.js';

export type ContractHelperCollection = {
  [key: string]: {
    [key: string]: ContractHelperInterface | undefined;
  };
};

@injectable()
export class ContractHelperRepository {
  @inject('Settings') settings!: Settings;

  logger!: Logger;
  private collection: ContractHelperCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    this.logger = logger;
    let logPrefix;
    const keys = Object.keys(settings.api.pools) as ChainsIds[];

    try {
      keys.forEach((chainId) => {
        logPrefix = `[ContractHelperRepository][${chainId}]`;
        const dexProtocolKey = Object.keys(settings.api.pools[chainId]!) as DexProtocolName[];
        const provider = <StaticJsonRpcProvider>blockchainProviderRepository.get(chainId);

        if (!provider) {
          logger.error(`${logPrefix} empty providerUrl`);
          return;
        }

        dexProtocolKey.forEach((dexProtocol) => {
          logPrefix = `[ContractHelperRepository][${chainId}][${dexProtocol}]`;
          const contractAddress = settings.api.pools[chainId]?.[dexProtocol]?.helperContractAddress;

          if (!contractAddress) {
            logger.error(`${logPrefix} empty contractAddress`);
            return;
          }

          this.collection[chainId] ||= {};
          this.collection[chainId][dexProtocol] = ContractHelperFactory.create(dexProtocol, provider, contractAddress);
          logger.info(`${logPrefix} contract helper ready`);
        });
      });
    } catch (e: unknown) {
      logger.error(`${logPrefix} ${(e as Error).message}`);
    }
  }

  get(chainId: ChainsIds, dexProtocol: DexProtocolName): ContractHelperInterface {
    const logPrefix = `[ContractHelperRepository][${chainId}][${dexProtocol}]`;

    if (!this.collection[chainId]?.[dexProtocol]) {
      throw Error(`${logPrefix} contract helper does not exist`);
    }

    return this.collection[chainId][dexProtocol]!;
  }
}
