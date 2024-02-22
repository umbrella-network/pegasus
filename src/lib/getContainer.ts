import {Container} from 'inversify';
import Settings from '../types/Settings.js';
import settings from '../config/settings.js';
import {Logger} from 'winston';
import logger from './logger.js';
import CryptoCompareWSClient from '../services/ws/CryptoCompareWSClient.js';
import PriceRepository from '../repositories/PriceRepository.js';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository.js';
import {CalculatorRepository} from '../repositories/CalculatorRepository.js';
import {FeedRepository} from '../repositories/FeedRepository.js';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService.js';
import {BlockchainProviderRepository} from '../repositories/BlockchainProviderRepository.js';
import {Redis} from 'ioredis';
import {initRedis} from '../config/initRedis.js';
import {MongoDBPriceRepository} from '../repositories/MongoDBPriceRepository.js';
import {ChainContractRepository} from '../repositories/ChainContractRepository.js';
import {BlockchainGasRepository} from '../repositories/BlockchainGasRepository.js';
import {BlockchainRepository} from '../repositories/BlockchainRepository.js';
import BlockRepository from '../repositories/BlockRepository.js';
import {ConsensusDataRepository} from '../repositories/ConsensusDataRepository.js';
import {DeviationSignerRepository} from '../repositories/DeviationSignerRepository.js';
import {DeviationTriggerConsensusRepository} from '../repositories/DeviationTriggerConsensusRepository.js';
import {DeviationTriggerLastIntervals} from '../repositories/DeviationTriggerLastIntervals.js';
import {FeedsContractRepository} from '../repositories/FeedsContractRepository.js';
import {LocalAssetRepository} from '../repositories/LocalAssetRepository.js';
import {MappingRepository} from '../repositories/MappingRepository.js';
import {ProviderRepository} from '../repositories/ProviderRepository.js';
import {RequiredSignaturesRepository} from '../repositories/RequiredSignaturesRepository.js';
import {StakingBankContractRepository} from '../repositories/StakingBankContractRepository.js';
import {UniswapFeedRepository} from '../repositories/UniswapFeedRepository.js';
import {ValidatorRepository} from '../repositories/ValidatorRepository.js';
import {BlockchainProviderFactory} from '../factories/BlockchainProviderFactory.js';
import {DeviationSignerFactory} from '../factories/DeviationSignerFactory.js';
import {FeedFactory} from '../factories/FeedFactory.js';
import {DeviationChainMetadata} from '../services/deviationsFeeds/DeviationChainMetadata.js';
import {DeviationConsensusRunner} from '../services/deviationsFeeds/DeviationConsensusRunner.js';
import {DeviationHasher} from '../services/deviationsFeeds/DeviationHasher.js';
import {DeviationLeader} from '../services/deviationsFeeds/DeviationLeader.js';
import {DeviationLeaderSelector} from '../services/deviationsFeeds/DeviationLeaderSelector.js';
import {DeviationSignatureCollector} from '../services/deviationsFeeds/DeviationSignatureCollector.js';
import {DeviationTrigger} from '../services/deviationsFeeds/DeviationTrigger.js';
import {DeviationTriggerFilters} from '../services/deviationsFeeds/DeviationTriggerFilters.js';
import {DeviationVerifier} from '../services/deviationsFeeds/DeviationVerifier.js';
import {IntervalTriggerFilter} from '../services/deviationsFeeds/IntervalTriggerFilter.js';
import {PriceDataOverflowChecker} from '../services/deviationsFeeds/PriceDataOverflowChecker.js';
import {PriceDataProvider} from '../services/deviationsFeeds/PriceDataProvider.js';
import {PriceMetadataComparator} from '../services/deviationsFeeds/PriceMetadataComparator.js';
import {PriceTriggerFilter} from '../services/deviationsFeeds/PriceTriggerFilter.js';
import {BlockChainDispatcher} from '../services/dispatchers/BlockChainDispatcher.js';
import {BlockDispatcher} from '../services/dispatchers/BlockDispatcher.js';
import {DeviationDispatcher} from '../services/dispatchers/DeviationDispatcher.js';
import {DeviationFeedsDispatcher} from '../services/dispatchers/DeviationFeedsDispatcher.js';
import {MultiChainStatusProcessor} from '../services/multiChain/MultiChainStatusProcessor.js';
import {MultiChainStatusResolver} from '../services/multiChain/MultiChainStatusResolver.js';
import {DeviationHasherEvm} from '../blockchains/evm/DeviationHasherEvm.js';
import {DeviationHasherMultiversX} from '../blockchains/multiversx/DeviationHasherMultiversX.js';
import ApplicationUpdateService from '../services/ApplicationUpdateService.js';
import BlockChainProviderFactory from '../services/BlockChainProviderFactory.js';
import {BlockchainScanner} from '../services/BlockchainScanner.js';
import BlockMinter from '../services/BlockMinter.js';
import BlockSigner from '../services/BlockSigner.js';
import {CanMint} from '../services/CanMint.js';
import {ConsensusOptimizer} from '../services/ConsensusOptimizer.js';
import ConsensusRunner from '../services/ConsensusRunner.js';
import CryptoCompareWSInitializer from '../services/CryptoCompareWSInitializer.js';
import {FeedDataService} from '../services/FeedDataService.js';
import FeedProcessor from '../services/FeedProcessor.js';
import PolygonIOCryptoPriceService from '../services/PolygonIOCryptoPriceService.js';

export function getContainer(): Container {
  const container = new Container({autoBindInjectable: true});
  container.bind<Settings>('Settings').toConstantValue(settings);
  container.bind<Logger>('Logger').toConstantValue(logger);

  container.bind(ApplicationUpdateService).toSelf().inSingletonScope();
  container.bind(BlockChainProviderFactory).toSelf().inSingletonScope();
  container.bind(BlockchainScanner).toSelf().inSingletonScope();
  container.bind(BlockMinter).toSelf().inSingletonScope();
  container.bind(BlockSigner).toSelf().inSingletonScope();
  container.bind(CanMint).toSelf().inSingletonScope();
  container.bind(ConsensusOptimizer).toSelf().inSingletonScope();
  container.bind(ConsensusRunner).toSelf().inSingletonScope();
  container.bind(CryptoCompareWSInitializer).toSelf().inSingletonScope();
  container.bind(FeedDataService).toSelf().inSingletonScope();
  container.bind(FeedProcessor).toSelf().inSingletonScope();
  container.bind(PolygonIOCryptoPriceService).toSelf().inSingletonScope();

  container.bind<CryptoCompareWSClient>(CryptoCompareWSClient).toSelf().inSingletonScope();
  container.bind(PriceRepository).toSelf().inSingletonScope();
  container.bind(FeedFetcherRepository).toSelf().inSingletonScope();
  container.bind(CalculatorRepository).toSelf().inSingletonScope();
  container.bind(FeedRepository).toSelf().inSingletonScope();
  container.bind(UniswapPoolService).toSelf().inSingletonScope();
  container.bind(BlockchainProviderRepository).toSelf().inSingletonScope();
  container.bind(MongoDBPriceRepository).toSelf().inSingletonScope();
  container.bind(ChainContractRepository).toSelf().inSingletonScope();
  container.bind(BlockchainGasRepository).toSelf().inSingletonScope();
  container.bind(BlockchainRepository).toSelf().inSingletonScope();
  container.bind(BlockRepository).toSelf().inSingletonScope();
  container.bind(ConsensusDataRepository).toSelf().inSingletonScope();
  container.bind(DeviationSignerRepository).toSelf().inSingletonScope();
  container.bind(DeviationTriggerConsensusRepository).toSelf().inSingletonScope();
  container.bind(DeviationTriggerLastIntervals).toSelf().inSingletonScope();
  container.bind(FeedsContractRepository).toSelf().inSingletonScope();
  container.bind(LocalAssetRepository).toSelf().inSingletonScope();
  container.bind(MappingRepository).toSelf().inSingletonScope();
  container.bind(ProviderRepository).toSelf().inSingletonScope();
  container.bind(RequiredSignaturesRepository).toSelf().inSingletonScope();
  container.bind(StakingBankContractRepository).toSelf().inSingletonScope();
  container.bind(UniswapFeedRepository).toSelf().inSingletonScope();
  container.bind(ValidatorRepository).toSelf().inSingletonScope();
  container.bind(BlockchainProviderFactory).toSelf().inSingletonScope();
  container.bind(DeviationSignerFactory).toSelf().inSingletonScope();
  container.bind(FeedFactory).toSelf().inSingletonScope();

  container.bind(MultiChainStatusProcessor).toSelf().inSingletonScope();
  container.bind(MultiChainStatusResolver).toSelf().inSingletonScope();

  container.bind(DeviationChainMetadata).toSelf().inSingletonScope();
  container.bind(DeviationConsensusRunner).toSelf().inSingletonScope();
  container.bind(DeviationHasher).toSelf().inSingletonScope();
  container.bind(DeviationLeader).toSelf().inSingletonScope();
  container.bind(DeviationLeaderSelector).toSelf().inSingletonScope();
  container.bind(DeviationSignatureCollector).toSelf().inSingletonScope();
  container.bind(DeviationTrigger).toSelf().inSingletonScope();
  container.bind(DeviationTriggerFilters).toSelf().inSingletonScope();
  container.bind(DeviationVerifier).toSelf().inSingletonScope();
  container.bind(IntervalTriggerFilter).toSelf().inSingletonScope();
  container.bind(PriceDataOverflowChecker).toSelf().inSingletonScope();
  container.bind(PriceDataProvider).toSelf().inSingletonScope();
  container.bind(PriceMetadataComparator).toSelf().inSingletonScope();
  container.bind(PriceTriggerFilter).toSelf().inSingletonScope();

  container.bind(BlockChainDispatcher).toSelf().inSingletonScope();
  container.bind(BlockDispatcher).toSelf().inSingletonScope();
  container.bind(DeviationDispatcher).toSelf().inSingletonScope();
  container.bind(DeviationFeedsDispatcher).toSelf().inSingletonScope();

  container.bind(DeviationHasherEvm).toSelf().inSingletonScope();
  container.bind(DeviationHasherEvm).toSelf().inSingletonScope();
  container.bind(DeviationHasherMultiversX).toSelf().inSingletonScope();

  container
    .bind<Redis>('Redis')
    .toDynamicValue((ctx) => initRedis(ctx.container.get('Settings')))
    .inSingletonScope();

  return container;
}
