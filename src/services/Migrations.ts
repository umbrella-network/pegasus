import newrelic from 'newrelic';
import Migration from '../models/Migration';
import {getModelForClass} from '@typegoose/typegoose';
import Block from '../models/Block';

class Migrations {
  static async apply(): Promise<void> {
    await Migrations.migrateTo429();
  }

  private static hasMigration = async (v: string): Promise<boolean> => {
    try {
      const migration = await getModelForClass(Migration).find({_id: v}).exec();
      return migration.length > 0;
    } catch (e) {
      newrelic.noticeError(e);
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
      newrelic.noticeError(e);
      console.error(e);
    }
  };

  private static migrateTo429 = async () => {
    await Migrations.wrapMigration('4.2.9', async () => {
      const blockCollection = getModelForClass(Block).collection;
      const blockIdIndex = 'blockId_-1';

      try {
        await blockCollection.dropIndex(blockIdIndex);
      } catch (_) {
        // we should have index, but just in case
      }

      await blockCollection.createIndex({blockId: -1}, {unique: false});
      console.log(`index ${blockIdIndex} recreated.`);
    });
  };
}

export default Migrations;
