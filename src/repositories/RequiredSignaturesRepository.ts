import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ChainsIds} from '../types/ChainsIds';
import {BlockchainType} from '../types/Settings';
import {MappingRepository} from './MappingRepository';
import {NumberOfSignaturesPerChain} from '../types/NumberOfSignatures';

@injectable()
export class RequiredSignaturesRepository {
  @inject('Logger') logger!: Logger;
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  readonly ID = 'NUMBER_OF_SIGNATURES';

  async get(blockchainType: BlockchainType, chainId: ChainsIds | undefined): Promise<number | undefined> {
    const data = await this.getAll();
    if (!data) return;

    if (!chainId) {
      const found = Object.entries(data).find(([, value]) => value[blockchainType] != 0);
      if (!found) return;

      chainId = found[0] as ChainsIds;
    }

    return data[chainId][blockchainType];
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
