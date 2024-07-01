import Migration from '../models/Migration.js';
import {getModelForClass, mongoose} from '@typegoose/typegoose';
import CachedValidator from '../models/CachedValidator.js';

class Migrations {
  static async apply(): Promise<void> {
    await Migrations.migrateTo7110();
    await Migrations.migrateTo_7_27_1();
  }

  private static hasMigration = async (v: string): Promise<boolean> => {
    try {
      const migration = await getModelForClass(Migration).find({_id: v}).exec();
      return migration.length > 0;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  private static saveMigration = async (v: string): Promise<void> => {
    await getModelForClass(Migration).create({_id: v, timestamp: new Date()});
  };

  private static wrapMigration = async (migrationId: string, callback: () => void) => {
    try {
      if (!(await Migrations.hasMigration(migrationId))) {
        console.log('Updating DB to match new schema', migrationId);
        await callback();
        await Migrations.saveMigration(migrationId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  private static migrateTo7110 = async () => {
    await Migrations.wrapMigration('7.11.0', async () => {
      // we have different index and validator per network, so let's simply drop and rebuild
      await getModelForClass(CachedValidator).collection.drop();
      console.log(`collection ${CachedValidator} removed.`);
    });
  };

  private static migrateTo_7_27_1 = async () => {
    await Migrations.wrapMigration('7.27.1', async () => {
      await dropCollection('fetcherhistories');
    });
  };
}

async function dropCollection(collectionName: string) {
  // Check if the collection exists
  const collections = await mongoose.connection.db.listCollections().toArray();
  const collectionExists = collections.some((collection) => collection.name === collectionName);

  if (collectionExists) {
    // Drop the collection if it exists
    await mongoose.connection.db.dropCollection(collectionName);
    console.log(`Collection '${collectionName}' dropped successfully.`);
  } else {
    console.log(`Collection '${collectionName}' does not exist.`);
  }
}

export default Migrations;
