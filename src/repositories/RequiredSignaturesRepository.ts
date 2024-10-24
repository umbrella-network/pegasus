import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ChainsIds} from '../types/ChainsIds.js';
import {BlockchainType} from '../types/Settings.js';
import {MappingRepository} from './MappingRepository.js';
import {NumberOfSignaturesPerChain} from '../types/NumberOfSignatures.js';

@injectable()
export class RequiredSignaturesRepository {
  @inject('Logger') logger!: Logger;
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  readonly ID = 'NUMBER_OF_SIGNATURES';

  async get(
    blockchainType: BlockchainType,
    chainId: ChainsIds | undefined,
  ): Promise<Record<string, number> | undefined> {
    const data = await this.getAll();
    if (!data) return;

    if (chainId) return {[chainId]: data[chainId][blockchainType]};

    const perChain: Record<string, number> = {};

    Object.entries(data).forEach(([id, value]) => {
      perChain[id] = value[blockchainType] ?? 0;
    });

    return perChain;
  }

  async cache(data: NumberOfSignaturesPerChain): Promise<void> {
    await this.mappingRepository.set(this.ID, JSON.stringify(data));
  }

  async getAll(): Promise<NumberOfSignaturesPerChain | undefined> {
    const rawData = await this.mappingRepository.get(this.ID);
    if (!rawData) return;

    return JSON.parse(rawData);
  }
}
