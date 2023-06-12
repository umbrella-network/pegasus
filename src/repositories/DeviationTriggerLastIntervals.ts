import {inject, injectable} from 'inversify';
import {MappingRepository} from './MappingRepository';

const DEVIATION_TRIGGER_LAST_INTERVALS = 'DeviationTriggerIntervals';

@injectable()
export class DeviationTriggerLastIntervals {
  @inject(MappingRepository) mappingRepository!: MappingRepository;

  async get(): Promise<Record<string, number>> {
    const data = (await this.mappingRepository.get(DEVIATION_TRIGGER_LAST_INTERVALS)) || '{}';
    return JSON.parse(data);
  }

  async set(keys: string[], lastCheckedAt: number): Promise<void> {
    const allIntervals = await this.get();

    keys.forEach((key) => {
      allIntervals[key] = lastCheckedAt;
    });

    await this.mappingRepository.set(DEVIATION_TRIGGER_LAST_INTERVALS, JSON.stringify(allIntervals));
  }
}
