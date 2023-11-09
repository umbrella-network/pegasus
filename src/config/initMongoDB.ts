import mongoose from 'mongoose';
import Settings from '../types/Settings.js';

export async function initMongoDB(settings: Settings): Promise<void> {
  mongoose.set('useFindAndModify', false);
  await mongoose.connect(settings.mongodb.url, {useNewUrlParser: true, useUnifiedTopology: true});
}
