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
      },
      required: ['discrepancy', 'precision', 'inputs'],
      additionalProperties: false,
    },
    input: {
      properties: {
        fetcher: {
          oneOf: [
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
            {$ref: '#/definitions/UniswapV3'},
            {$ref: '#/definitions/OptionsPriceFetcher'},
            {$ref: '#/definitions/YearnVaultTokenPriceFetcher'},
            {$ref: '#/definitions/RandomNumberFetcher'},
            {$ref: '#/definitions/TWAPGasPriceFetcher'},
            {$ref: '#/definitions/GoldApiPriceFetcher'},
            {$ref: '#/definitions/MetalPriceApiFetcher'},
            {$ref: '#/definitions/MetalsDevApiPriceFetcher'},
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
    GVolImpliedVolatilityFetcher: {
      properties: {
        name: {const: 'GVolImpliedVolatility'},
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
        name: {const: 'CryptoComparePrice'},
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
        name: {const: 'CryptoComparePriceWS'},
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
        name: {const: 'CryptoCompareHistoHour'},
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
        name: {const: 'CryptoCompareHistoDay'},
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
        name: {const: 'CoinmarketcapPrice'},
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
        name: {const: 'CoinmarketcapHistoHour'},
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
        name: {const: 'CoinmarketcapHistoDay'},
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
        name: {const: 'CoingeckoPrice'},
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
        name: {const: 'PolygonIOPrice'},
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
        name: {const: 'PolygonIOStockPrice'},
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
        name: {const: 'PolygonIOCryptoPrice'},
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
        name: {const: 'IEXEnergy'},
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
        name: {const: 'BEACPIAverage'},
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
        name: {const: 'TWAPGasPrice'},
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
        name: {const: 'OnChainData'},
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
    UniswapV3: {
      properties: {
        name: {const: 'UniswapV3'},
        params: {
          type: 'object',
          properties: {
            chainFrom: {type: 'array'},
            token0: {type: 'string'},
            token1: {type: 'string'},
          },
          required: ['chainFrom', 'token0', 'token1'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    GoldApiPriceFetcher: {
      properties: {
        name: {const: 'GoldApiPrice'},
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
        name: {const: 'MetalPriceApi'},
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
        name: {const: 'MetalsDevApi'},
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
        name: {const: 'PolygonIOCurrencySnapshotGrams'},
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
        name: {const: 'OptionsPrice'},
      },
    },
    YearnVaultTokenPriceFetcher: {
      properties: {
        name: {const: 'YearnVaultTokenPrice'},
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
        name: {const: 'RandomNumber'},
        params: {
          type: 'object',
          properties: {
            numBlocks: {type: 'number'},
          },
        },
      },
      additionalProperties: false,
    },
    YearnTransformPriceCalculator: {
      properties: {
        name: {const: 'YearnTransformPrice'},
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
        name: {const: 'OptionsPrice'},
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
        name: {const: 'Identity'},
      },
      additionalProperties: false,
    },
    TWAPCalculator: {
      properties: {
        name: {const: 'TWAP'},
      },
      additionalProperties: false,
    },
    VWAPCalculator: {
      properties: {
        name: {const: 'VWAP'},
      },
      additionalProperties: false,
    },
  },
};
