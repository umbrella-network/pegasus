import {Container} from 'inversify';
import Settings from '../types/Settings';
import settings from '../config/settings';
import {Logger} from 'winston';
import logger from './logger';
import ChainContract from '../contracts/ChainContract';
import Blockchain from './Blockchain';
import CryptoCompareWSClient from '../services/ws/CryptoCompareWSClient';
import PairRepository from '../repositories/PairRepository';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository';
import {CalculatorRepository} from '../repositories/CalculatorRepository';
import {FeedRepository} from '../repositories/FeedRepository';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService';
import {BlockchainProviderRepository} from '../repositories/BlockchainProviderRepository';
import {Redis} from 'ioredis';
import {initRedis} from '../config/initRedis';
import {PriceRepository} from '../repositories/PriceRepository';

export function getContainer(): Container {
  const container = new Container({autoBindInjectable: true});
  container.bind<Settings>('Settings').toConstantValue(settings);
  container.bind<Logger>('Logger').toConstantValue(logger);
  container.bind<ChainContract>(ChainContract).toSelf().inSingletonScope();
  container.bind<Blockchain>(Blockchain).toSelf().inSingletonScope();
  container.bind<CryptoCompareWSClient>(CryptoCompareWSClient).toSelf().inSingletonScope();
  container.bind(PairRepository).toSelf().inSingletonScope();
  container.bind(FeedFetcherRepository).toSelf().inSingletonScope();
  container.bind(CalculatorRepository).toSelf().inSingletonScope();
  container.bind(FeedRepository).toSelf().inSingletonScope();
  container.bind(UniswapPoolService).toSelf().inSingletonScope();
  container.bind(BlockchainProviderRepository).toSelf().inSingletonScope();
  container.bind(PriceRepository).toSelf().inSingletonScope();

  container
    .bind<Redis>('Redis')
    .toDynamicValue((ctx) => initRedis(ctx.container.get('Settings')))
    .inSingletonScope();

  return container;
}
