import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {MappingRepository} from '../repositories/MappingRepository.js';
import {BlockchainProviderRepository} from '../repositories/BlockchainProviderRepository.js';
import {DexRepository} from '../repositories/DexRepository.js';

export type Result = {
  fromBlock: number;
  toBlock?: number;
  success: boolean;
  synchronized?: boolean;
  waitBlockRange?: boolean;
};

@injectable()
export abstract class DexPoolScannerBase {
  @inject('Logger') logger!: Logger;
  @inject(MappingRepository) mappingRepository!: MappingRepository;
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;
  @inject(DexRepository) dexRepository!: DexRepository;

  // constructor(
  //   @inject('Logger') logger: Logger,
  //   @inject(MappingRepository) mappingRepository: MappingRepository,
  //   @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  //   @inject(DexRepository) dexRepository: DexRepository,
  // ) {
  //   this.logger = logger;
  //   this.mappingRepository = mappingRepository;
  //   this.blockchainProviderRepository = blockchainProviderRepository;
  //   this.dexRepository = dexRepository;
  // }

  abstract apply(fromBlock: number, toBlock: number): Promise<boolean>;
  abstract run(): Promise<Result>;
}
