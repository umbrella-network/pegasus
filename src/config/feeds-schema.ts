import {CalculatorName} from '../types/Calculator.js';
import {FetcherName} from '../types/fetchers.js';

export default {
  description: 'Feeds schema for the JSONSchema validator',
  type: 'object',
  propertyNames: {
    pattern: '^[A-Za-z0-9/*][A-Za-z0-9-:_/*]*$',
  },
  patternProperties: {
    '.*': {type: 'object', $ref: '#/definitions/feed'},
  },
  minProperties: 1,
  definitions: {
    feed: {
      properties: {
        heartbeat: {type: 'number'},
        trigger: {type: 'number'},
        discrepancy: {type: 'number'},
        precision: {type: 'number'},
        interval: {type: 'number'},
        inputs: {type: 'array', minItems: 1, items: {$ref: '#/definitions/input'}},
        chains: {type: 'array', minItems: 1},
        base: {type: 'string'},
        quote: {type: 'string'},
      },
      required: ['discrepancy', 'precision', 'inputs'],
      additionalProperties: false,
    },
    input: {
      properties: {
        fetcher: {
          oneOf: [
            {$ref: '#/definitions/ByBitSpotFetcher'},
            {$ref: '#/definitions/BinanceFetcher'},
            {$ref: '#/definitions/GVolImpliedVolatilityFetcher'},
            {$ref: '#/definitions/CryptoCompareHistoDayFetcher'},
            {$ref: '#/definitions/CryptoCompareHistoHourFetcher'},
            {$ref: '#/definitions/CryptoComparePriceFetcher'},
            {$ref: '#/definitions/CryptoComparePriceWSFetcher'},
            {$ref: '#/definitions/PolygonIOPriceFetcher'},
            {$ref: '#/definitions/PolygonIOStockPriceFetcher'},
            {$ref: '#/definitions/PolygonIOCryptoPriceFetcher'},
            {$ref: '#/definitions/PolygonIOCurrencySnapshotGramsFetcher'},
            {$ref: '#/definitions/IEXEnergyFetcher'},
            {$ref: '#/definitions/BEACPIAverageFetcher'},
            {$ref: '#/definitions/CoingeckoPriceFetcher'},
            {$ref: '#/definitions/CoinmarketcapPriceFetcher'},
            {$ref: '#/definitions/CoinmarketcapHistoHourFetcher'},
            {$ref: '#/definitions/CoinmarketcapHistoDayFetcher'},
            {$ref: '#/definitions/OnChainDataFetcher'},
            {$ref: '#/definitions/UniswapV3Fetcher'},
            {$ref: '#/definitions/OptionsPriceFetcher'},
            {$ref: '#/definitions/YearnVaultTokenPriceFetcher'},
            {$ref: '#/definitions/RandomNumberFetcher'},
            {$ref: '#/definitions/TWAPGasPriceFetcher'},
            {$ref: '#/definitions/GoldApiPriceFetcher'},
            {$ref: '#/definitions/MetalPriceApiFetcher'},
            {$ref: '#/definitions/MetalsDevApiPriceFetcher'},
            {$ref: '#/definitions/SovrynPriceFetcher'},
          ],
        },
        calculator: {
          oneOf: [
            {$ref: '#/definitions/TWAPCalculator'},
            {$ref: '#/definitions/VWAPCalculator'},
            {$ref: '#/definitions/IdentityCalculator'},
            {$ref: '#/definitions/OptionsPriceCalculator'},
            {$ref: '#/definitions/YearnTransformPriceCalculator'},
          ],
        },
      },
      required: ['fetcher'],
      additionalProperties: false,
    },
    ByBitSpotFetcher: {
      properties: {
        name: {const: 'ByBit'},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
          },
          required: ['symbol'],
        },
      },
    },
    BinanceFetcher: {
      properties: {
        name: {const: FetcherName.BINANCE},
        params: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            currency: {type: 'string'},
          },
          required: ['id', 'currency'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    GVolImpliedVolatilityFetcher: {
      properties: {
        name: {const: FetcherName.G_VOL_IMPLIED_VOLATILITY},
        params: {
          type: 'object',
          properties: {
            query: {type: 'string'},
            sym: {type: 'string'},
          },
          required: ['query', 'sym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CryptoComparePriceFetcher: {
      properties: {
        name: {const: FetcherName.CRYPTO_COMPARE_PRICE},
        params: {
          type: 'object',
          properties: {
            fsym: {type: 'string'},
            tsyms: {type: 'string'},
          },
          required: ['fsym', 'tsyms'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CryptoComparePriceWSFetcher: {
      properties: {
        name: {const: FetcherName.CRYPTO_COMPARE_PRICE_WS},
        params: {
          type: 'object',
          properties: {
            fsym: {type: 'string'},
            tsym: {type: 'string'},
            freshness: {type: 'number'},
          },
          required: ['fsym', 'tsym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CryptoCompareHistoHourFetcher: {
      properties: {
        name: {const: FetcherName.CRYPTO_COMPARE_HISTO_HOUR},
        params: {
          type: 'object',
          properties: {
            fsym: {type: 'string'},
            tsym: {type: 'string'},
            limit: {type: 'number'},
          },
          required: ['fsym', 'tsym', 'limit'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CryptoCompareHistoDayFetcher: {
      properties: {
        name: {const: FetcherName.CRYPTO_COMPARE_HISTO_DAY},
        params: {
          type: 'object',
          properties: {
            fsym: {type: 'string'},
            tsym: {type: 'string'},
            limit: {type: 'number'},
          },
          required: ['fsym', 'tsym', 'limit'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CoinmarketcapPriceFetcher: {
      properties: {
        name: {const: FetcherName.COINMARKETCAP_PRICE},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
            convert: {type: 'string'},
          },
          required: ['symbol', 'convert'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CoinmarketcapHistoHourFetcher: {
      properties: {
        name: {const: FetcherName.COINMARKETCAP_HISTO_HOUR},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
            convert: {type: 'string'},
            count: {type: 'number'},
          },
          required: ['symbol', 'convert', 'count'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CoinmarketcapHistoDayFetcher: {
      properties: {
        name: {const: FetcherName.COINMARKETCAP_HISTO_DAY},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
            convert: {type: 'string'},
            count: {type: 'number'},
          },
          required: ['symbol', 'convert', 'count'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    CoingeckoPriceFetcher: {
      properties: {
        name: {const: FetcherName.COINGECKO_PRICE},
        params: {
          type: 'object',
          properties: {
            id: {type: 'string'},
            currency: {type: 'string'},
          },
          required: ['id', 'currency'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    PolygonIOPriceFetcher: {
      properties: {
        name: {const: FetcherName.POLYGON_IO_PRICE},
        params: {
          type: 'object',
          properties: {
            sym: {type: 'string'},
          },
          required: ['sym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    PolygonIOStockPriceFetcher: {
      properties: {
        name: {const: FetcherName.POLYGON_IO_STOCK_PRICE},
        params: {
          type: 'object',
          properties: {
            sym: {type: 'string'},
          },
          required: ['sym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    PolygonIOCryptoPriceFetcher: {
      properties: {
        name: {const: FetcherName.POLYGON_IO_CRYPTO_PRICE},
        params: {
          type: 'object',
          properties: {
            fsym: {type: 'string'},
            tsym: {type: 'string'},
          },
          required: ['fsym', 'tsym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    IEXEnergyFetcher: {
      properties: {
        name: {const: FetcherName.IEX_ENERGY},
        params: {
          type: 'object',
          properties: {
            sym: {type: 'string'},
          },
          required: ['sym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    BEACPIAverageFetcher: {
      properties: {
        name: {const: FetcherName.BEACPI_AVERAGE},
        params: {
          type: 'object',
          properties: {
            months: {type: 'number'},
          },
          required: ['months'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    TWAPGasPriceFetcher: {
      properties: {
        name: {const: FetcherName.TWAP_GAS_PRICE},
        params: {
          type: 'object',
          properties: {
            twap: {type: 'number'},
            chainId: {type: 'string'},
          },
          required: ['twap', 'chainId'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    OnChainDataFetcher: {
      properties: {
        name: {const: FetcherName.ON_CHAIN_DATA},
        params: {
          type: 'object',
          properties: {
            address: {type: 'string'},
            method: {type: 'string'},
            inputs: {type: 'array'},
            outputs: {type: 'array'},
            args: {type: 'array'},
            returnIndex: {type: 'number'},
            chainId: {type: 'string'},
            decimals: {type: 'number'},
          },
          required: ['address', 'method', 'inputs', 'outputs', 'args'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    UniswapV3Fetcher: {
      properties: {
        name: {const: FetcherName.UNISWAP_V3},
        params: {
          type: 'object',
          properties: {
            fromChain: {type: 'string'},
            base: {type: 'string'},
            quote: {type: 'string'},
            amountInDecimals: {type: 'number'},
          },
          required: ['fromChain', 'base', 'quote', 'amountInDecimals'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    GoldApiPriceFetcher: {
      properties: {
        name: {const: FetcherName.GOLD_API_PRICE},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
            currency: {type: 'string'},
          },
          required: ['symbol', 'currency'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    MetalPriceApiFetcher: {
      properties: {
        name: {const: FetcherName.METAL_PRICE_API},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
            currency: {type: 'string'},
          },
          required: ['symbol', 'currency'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    MetalsDevApiPriceFetcher: {
      properties: {
        name: {const: FetcherName.METALS_DEV_API},
        params: {
          type: 'object',
          properties: {
            metal: {type: 'string'},
            currency: {type: 'string'},
          },
          required: ['metal', 'currency'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    PolygonIOCurrencySnapshotGramsFetcher: {
      properties: {
        name: {const: FetcherName.POLYGON_IO_CURRENCY_SNAPSHOT_GRAMS},
        params: {
          type: 'object',
          properties: {
            ticker: {type: 'string'},
          },
          required: ['ticker'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    OptionsPriceFetcher: {
      properties: {
        name: {const: FetcherName.OPTIONS_PRICE},
      },
    },
    YearnVaultTokenPriceFetcher: {
      properties: {
        name: {const: FetcherName.YEARN_VAULT_TOKEN_PRICE},
        params: {
          type: 'object',
          properties: {
            network: {type: 'string'},
            address: {type: 'string'},
          },
          required: ['address'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    RandomNumberFetcher: {
      properties: {
        name: {const: FetcherName.RANDOM_NUMBER},
        params: {
          type: 'object',
          properties: {
            numBlocks: {type: 'number'},
          },
        },
      },
      additionalProperties: false,
    },
    SovrynPriceFetcher: {
      properties: {
        name: {const: FetcherName.SOVRYN_PRICE},
        params: {
          type: 'object',
          properties: {
            base: {type: 'string'},
            quote: {type: 'string'},
            amountInDecimals: {type: 'number'},
            quoteDecimals: {type: 'number'},
          },
          required: ['base', 'quote', 'amountInDecimals'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    YearnTransformPriceCalculator: {
      properties: {
        name: {const: CalculatorName.YEARN_TRANSFORM_PRICE},
        params: {
          type: 'object',
          properties: {
            tsym: {type: 'string'},
          },
          required: ['tsym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    OptionsPriceCalculator: {
      properties: {
        name: {const: CalculatorName.OPTIONS_PRICE},
        params: {
          type: 'object',
          properties: {
            sym: {type: 'string'},
          },
          required: ['sym'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    IdentityCalculator: {
      properties: {
        name: {const: CalculatorName.IDENTITY},
      },
      additionalProperties: false,
    },
    TWAPCalculator: {
      properties: {
        name: {const: CalculatorName.TWAP},
      },
      additionalProperties: false,
    },
    VWAPCalculator: {
      properties: {
        name: {const: CalculatorName.VWAP},
      },
      additionalProperties: false,
    },
  },
};
