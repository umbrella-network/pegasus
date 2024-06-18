import {getModelForClass} from '@typegoose/typegoose';
import {ModelType} from '@typegoose/typegoose/lib/types.js';

import Migration from '../models/Migration.js';
import CachedValidator from '../models/CachedValidator.js';
import {UniswapV3Pool} from '../models/UniswapV3Pool.js';
import {Token} from '../models/Token.js';

class Migrations {
  static async apply(): Promise<void> {
    await Migrations.migrateTo7110();
    await Migrations.migrateTo7280();
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

  private static migrateTo7280 = async () => {
    await Migrations.wrapMigration('7.28.0', async () => {
      // we have different index and validator per network, so let's simply drop and rebuild
      const [uniswapV3PoolModel, tokenModel] = await Promise.all([
        getModelForClass(UniswapV3Pool),
        getModelForClass(Token),
      ]);

      console.log('get UniswapV3Pool and Token models.');

      const uniswapV3PoolMigration = getUniswapV3Migration(uniswapV3PoolModel);
      const tokenMigration = getTokenMigration(tokenModel);

      try {
        await Promise.all([uniswapV3PoolMigration, tokenMigration]);
      } catch (reason) {
        throw new Error(`Migration 7.28.0 failed: ${reason}`);
      }

      console.log('Migration 7.28.0 finished');
    });
  };
}

async function getUniswapV3Migration(uniswapV3PoolModel: ModelType<UniswapV3Pool>) {
  const uniswapV3Pools = [
    {
      chainId: 'ethereum',
      protocol: 'uniswapV3',
      token0: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB98',
      token1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756CD2',
      fee: 3000,
      address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5740',
      liquidityActive: '2090386241959957974528',
      liquidityLockedToken0: 0.00008402189699766422,
      liquidityLockedToken1: 38061.47932609679,
      liquidityUpdatedAt: new Date(2024, 5, 13),
    },
  ];

  const uniswapV3PoolMigration = Promise.all(
    uniswapV3Pools.map((uniswapV3Pool) => {
      const filter = {
        chainId: uniswapV3Pool.chainId,
        fee: uniswapV3Pool.fee,
        token0: uniswapV3Pool.token0,
        token1: uniswapV3Pool.token1,
        address: uniswapV3Pool.address,
      };

      return uniswapV3PoolModel.findOneAndUpdate(filter, uniswapV3Pool, {upsert: true}).exec();
    }),
  );

  return uniswapV3PoolMigration;
}

async function getTokenMigration(tokenModel: ModelType<Token>) {
  const tokens = [
    {
      chainId: 'ethereum',
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc20099',
      symbol: 'TBTC',
      name: 'Test',
      decimals: 18,
    },
  ];

  const tokenMigration = Promise.all(
    tokens.map((token) => {
      const filter = {
        chainId: token.chainId,
        address: token.address,
      };

      return tokenModel.findOneAndUpdate(filter, token, {upsert: true}).exec();
    }),
  );

  return tokenMigration;
}

export default Migrations;
