import {injectable} from 'inversify';
import {getModelForClass} from '@typegoose/typegoose';
import {Mapping} from '../models/Mapping.js';

@injectable()
export class MappingRepository {
  async get(_id: string): Promise<string | undefined> {
    const map = await getModelForClass(Mapping).findOne({_id}).exec();
    return map?.value;
  }

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const map = await getModelForClass(Mapping)
      .find({_id: {$in: keys}})
      .exec();

    return map.reduce(
      (acc, data) => {
        acc[data._id] = data.value;
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async set(_id: string, value: string): Promise<void> {
    const MappingModel = getModelForClass(Mapping);
    await MappingModel.findOneAndUpdate({_id}, {_id, value, updatedAt: new Date()}, {upsert: true, new: true}).exec();
  }

  async remove(_id: string): Promise<void> {
    const MappingModel = getModelForClass(Mapping);
    await MappingModel.deleteOne({_id}).exec();
  }

  async setMany(data: {_id: string; value: string}[]): Promise<void> {
    await Promise.all(data.map(({_id, value}) => this.set(_id, value)));
  }
}
