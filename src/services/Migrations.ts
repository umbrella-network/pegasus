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
      chainId: 'rootstock',
      protocol: 'uniswapV3',
      token0: '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d',
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96',
      fee: 500,
      address: '0xd2ffe51ab4e622a411abbe634832a19d919e9c55',
      liquidityActive: '17716643053084368348144',
      liquidityLockedToken0: 1,
      liquidityLockedToken1: 1,
      liquidityUpdatedAt: new Date(Date.now()),
    },
    {
      chainId: 'rootstock',
      protocol: 'uniswapV3',
      token0: '0x2AcC95758f8b5F583470ba265EB685a8F45fC9D5',
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96',
      fee: 500,
      address: '0x022650756421f2e636d4138054331cbfafb55d9e',
      liquidityActive: '17716643053084368348144',
      liquidityLockedToken0: 1,
      liquidityLockedToken1: 1,
      liquidityUpdatedAt: new Date(Date.now()),
    },
    {
      chainId: 'rootstock',
      protocol: 'uniswapV3',
      token0: '0x3A15461d8aE0F0Fb5Fa2629e9DA7D66A794a6e37',
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96',
      fee: 500,
      address: '0x549a5d92412161a1a2828549a657a49dd9fa046c',
      liquidityActive: '17716643053084368348144',
      liquidityLockedToken0: 1,
      liquidityLockedToken1: 1,
      liquidityUpdatedAt: new Date(Date.now()),
    },
    {
      chainId: 'rootstock',
      protocol: 'uniswapV3',
      token0: '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db',
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96',
      fee: 500,
      address: '0x3151d3093797412642685ad16e74a83859f2011c',
      liquidityActive: '17716643053084368348144',
      liquidityLockedToken0: 1,
      liquidityLockedToken1: 1,
      liquidityUpdatedAt: new Date(Date.now()),
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
      chainId: 'rootstock',
      address: '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d',
      symbol: 'WRBTC',
      name: 'Wrapped BTC',
      decimals: 18,
    },
    {
      chainId: 'rootstock',
      address: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96',
      symbol: 'rUSDT',
      name: 'rUSDT',
      decimals: 18,
    },
    {
      chainId: 'rootstock',
      address: '0x2AcC95758f8b5F583470ba265EB685a8F45fC9D5',
      symbol: 'RIF',
      name: 'RIF',
      decimals: 18,
    },
    {
      chainId: 'rootstock',
      address: '0x3A15461d8aE0F0Fb5Fa2629e9DA7D66A794a6e37',
      symbol: 'USDRIF',
      name: 'RIF US Dollar',
      decimals: 18,
    },
    {
      chainId: 'rootstock',
      address: '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db',
      symbol: 'DOC',
      name: 'Dollar on Chain',
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
