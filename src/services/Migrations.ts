import {getModelForClass, mongoose, ReturnModelType} from '@typegoose/typegoose';
import {ModelType} from '@typegoose/typegoose/lib/types.js';
import {BeAnObject} from '@typegoose/typegoose/lib/types.js';

import Migration from '../models/Migration.js';
import CachedValidator from '../models/CachedValidator.js';
import {UniswapV3Pool} from '../models/UniswapV3Pool.js';
import {Token} from '../models/Token.js';
import {PriceModel_Binance} from '../models/fetchers/PriceModel_Binance.js';
import {PriceModel_ByBit} from '../models/fetchers/PriceModel_ByBit.js';
import {PriceModel_Coingecko} from '../models/fetchers/PriceModel_Coingecko.js';
import {PriceModel_GoldApi} from '../models/fetchers/PriceModel_GoldApi.js';
import {PriceModel_MetalPriceApi} from '../models/fetchers/PriceModel_MetalPriceApi.js';
import {PriceModel_MetalsDevApi} from '../models/fetchers/PriceModel_MetalsDevApi.js';
import {PriceModel_MoCMeasurement} from '../models/fetchers/PriceModel_MoCMeasurement.js';
import {PriceModel_PolygonIOCryptoSnapshot} from '../models/fetchers/PriceModel_PolygonIOCryptoSnapshot.js';
import {PriceModel_PolygonIOCurrencySnapshotGrams} from '../models/fetchers/PriceModel_PolygonIOCurrencySnapshotGrams.js';
import {PriceModel_PolygonIOSingleCrypto} from '../models/fetchers/PriceModel_PolygonIOSingleCrypto.js';
import {PriceModel_PolygonIOStockSnapshot} from '../models/fetchers/PriceModel_PolygonIOStockSnapshot.js';
import {PriceModel_Sovryn} from '../models/fetchers/PriceModel_Sovryn.js';
import {PriceModel_UniswapV3} from '../models/fetchers/PriceModel_UniswapV3.js';

class Migrations {
  static async apply(): Promise<void> {
    await Migrations.migrateTo7110();
    await Migrations.migrateTo_7_27_1();
    await Migrations.migrateTo7280();
    await Migrations.migrateTo_8_5_8();
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

  private static migrateTo_8_5_8 = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dropCollection = async (model: ReturnModelType<any, BeAnObject>) => {
      try {
        console.log(`dropping ${model.name}...`);
        await getModelForClass(model).collection.drop();
      } catch (reason) {
        if (JSON.stringify(reason).includes('ns not found')) {
          console.log(`${model.name} not found`);
          return;
        }

        throw new Error(`Migration 8.5.8 failed: ${reason}`);
      }
    };

    await Migrations.wrapMigration('8.5.8', async () => {
      await dropCollection(PriceModel_Binance);
      await dropCollection(PriceModel_ByBit);
      await dropCollection(PriceModel_Coingecko);
      await dropCollection(PriceModel_GoldApi);
      await dropCollection(PriceModel_MetalPriceApi);
      await dropCollection(PriceModel_MetalsDevApi);
      await dropCollection(PriceModel_MoCMeasurement);
      await dropCollection(PriceModel_PolygonIOCryptoSnapshot);
      await dropCollection(PriceModel_PolygonIOCurrencySnapshotGrams);
      await dropCollection(PriceModel_PolygonIOSingleCrypto);
      await dropCollection(PriceModel_PolygonIOStockSnapshot);
      await dropCollection(PriceModel_Sovryn);
      await dropCollection(PriceModel_UniswapV3);

      console.log('Migration 8.5.8 finished');
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

async function getUniswapV3Migration(uniswapV3PoolModel: ModelType<UniswapV3Pool>) {
  const uniswapV3Pools = [
    {
      chainId: 'rootstock',
      protocol: 'uniswapV3',
      token0: '0x542fDA317318eBF1d3DEAf76E0b632741A7e677d'.toLowerCase(),
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96'.toLowerCase(),
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
      token0: '0x2AcC95758f8b5F583470ba265EB685a8F45fC9D5'.toLowerCase(),
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96'.toLowerCase(),
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
      token0: '0x3A15461d8aE0F0Fb5Fa2629e9DA7D66A794a6e37'.toLowerCase(),
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96'.toLowerCase(),
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
      token0: '0xe700691dA7b9851F2F35f8b8182c69c53CcaD9Db'.toLowerCase(),
      token1: '0xef213441A85dF4d7ACbDaE0Cf78004e1E486bB96'.toLowerCase(),
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
