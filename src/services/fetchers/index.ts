import PolygonIOCryptoPriceFetcher from './PolygonIOCryptoPriceFetcher.js';
import PolygonIOStockPriceFetcher from './PolygonIOStockPriceFetcher.js';
import PolygonIOCurrencySnapshotGramsFetcher from './PolygonIOCurrencySnapshotGramsFetcher.js';
import YearnVaultTokenPriceFetcher from './YearnVaultTokenPriceFetcher.js';
import CoingeckoPriceFetcher from './CoingeckoPriceFetcher.js';
import {UniswapPriceFetcher} from './UniswapPriceFetcher.js';
import OptionsPriceFetcher from './OptionsPriceFetcher.js';
import RandomNumberFetcher from './RandomNumberFetcher.js';
import OnChainDataFetcher from './OnChainDataFetcher.js';
import EvmTWAPGasPriceFetcher from './EvmTWAPGasPriceFetcher.js';
import MetalPriceApiFetcher from './MetalPriceApiFetcher.js';
import MetalsDevApiPriceFetcher from './MetalsDevApiFetcher.js';
import GoldApiPriceFetcher from './GoldApiPriceFetcher.js';
import ByBitFetcher from './ByBitPriceFetcher.js';
import BinanceFetcher from './BinancePriceFetcher.js';

export {
  ByBitFetcher as ByBitSpotFetcher,
  BinanceFetcher as BinancePriceMultiFetcher,
  PolygonIOStockPriceFetcher,
  PolygonIOCryptoPriceFetcher,
  PolygonIOCurrencySnapshotGramsFetcher,
  YearnVaultTokenPriceFetcher,
  CoingeckoPriceFetcher as CoingeckoPriceMultiFetcher,
  OptionsPriceFetcher,
  UniswapPriceFetcher,
  RandomNumberFetcher,
  OnChainDataFetcher,
  EvmTWAPGasPriceFetcher,
  GoldApiPriceFetcher,
  MetalPriceApiFetcher,
  MetalsDevApiPriceFetcher,
};
