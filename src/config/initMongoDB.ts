import Settings from '../types/Settings';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';
import Block from '../models/Block';

const updateDB = async (): Promise<void> => {
  try {
    const blockModel = getModelForClass(Block);
    console.log('Updating DB to match new schema');
    const deletedBlocks = await blockModel.collection.deleteMany({
      $or: [{blockId: {$exists: false}}, {numericFcdKeys: {$exists: true}}],
    });
    console.log(`Deleted ${deletedBlocks.deletedCount} deprecated Blocks`);

    const heightIndexes = ['height_-1', 'height_1'];
    heightIndexes.forEach(async (heightIndex): Promise<void> => {
      if (await blockModel.collection.indexExists(heightIndex)) {
        await blockModel.collection.dropIndex(heightIndex);
        console.log(`${heightIndex} removed`);
      }
    });
  } catch (e) {
    console.error(`Error while updating DB: ${e}`);
  }
};

export async function initMongoDB(settings: Settings): Promise<void> {
  mongoose.set('useFindAndModify', false);
  await mongoose.connect(settings.mongodb.url, {useNewUrlParser: true, useUnifiedTopology: true});

  await updateDB();
}
