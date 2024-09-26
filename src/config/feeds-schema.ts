import {CalculatorName} from '../types/Calculator.js';
import {FetcherName} from '../types/fetchers.js';
import {MoCMeasurementGetter} from '../services/fetchers';

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
            {$ref: '#/definitions/ByBitPrice'},
            {$ref: '#/definitions/BinancePrice'},
            {$ref: '#/definitions/GVolImpliedVolatility'},
            {$ref: '#/definitions/PolygonIOCryptoSnapshotPrice'},
            {$ref: '#/definitions/PolygonIOSingleCryptoPrice'},
            {$ref: '#/definitions/PolygonIOCurrencySnapshotGrams'},
            {$ref: '#/definitions/PolygonIOStockSnapshotPrice'},
            {$ref: '#/definitions/CoingeckoPrice'},
            {$ref: '#/definitions/OnChainData'},
            {$ref: '#/definitions/UniswapV3'},
            {$ref: '#/definitions/OptionsPrice'},
            {$ref: '#/definitions/YearnVaultTokenPrice'},
            {$ref: '#/definitions/RandomNumber'},
            {$ref: '#/definitions/TWAPGasPrice'},
            {$ref: '#/definitions/GoldApiPrice'},
            {$ref: '#/definitions/MetalPriceApi'},
            {$ref: '#/definitions/MetalsDevApi'},
            {$ref: '#/definitions/MoCMeasurement'},
            {$ref: '#/definitions/SovrynPrice'},
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
    ByBitPrice: {
      properties: {
        name: {const: 'ByBitPrice'},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
          },
          required: ['symbol'],
        },
      },
    },
    BinancePrice: {
      properties: {
        name: {const: FetcherName.BinancePrice},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
            inverse: {type: 'boolean'},
          },
          required: ['symbol'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    GVolImpliedVolatility: {
      properties: {
        name: {const: FetcherName.GVolImpliedVolatility},
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
    CoingeckoPrice: {
      properties: {
        name: {const: FetcherName.CoingeckoPrice},
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
    PolygonIOCryptoSnapshotPrice: {
      properties: {
        name: {const: FetcherName.PolygonIOCryptoSnapshotPrice},
        params: {
          type: 'object',
          properties: {
            symbol: {type: 'string'},
          },
          required: ['symbol'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    PolygonIOSingleCryptoPrice: {
      properties: {
        name: {const: FetcherName.PolygonIOSingleCryptoPrice},
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
    PolygonIOStockSnapshotPrice: {
      properties: {
        name: {const: FetcherName.PolygonIOStockSnapshotPrice},
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
    TWAPGasPrice: {
      properties: {
        name: {const: FetcherName.TWAPGasPrice},
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
    OnChainData: {
      properties: {
        name: {const: FetcherName.OnChainData},
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
        name: {const: FetcherName.UniswapV3},
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
    GoldApiPrice: {
      properties: {
        name: {const: FetcherName.GoldApiPrice},
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
    MetalPriceApi: {
      properties: {
        name: {const: FetcherName.MetalPriceApi},
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
    MoCMeasurement: {
      properties: {
        name: {const: FetcherName.MoCMeasurement},
        params: {
          type: 'object',
          properties: {
            measurement_id: {type: 'string'},
            field: {type: 'string'},
          },
          required: ['measurement_id', 'field'],
          additionalProperties: false,
        },
      },
      required: ['params'],
      additionalProperties: false,
    },
    MetalsDevApi: {
      properties: {
        name: {const: FetcherName.MetalsDevApi},
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
    PolygonIOCurrencySnapshotGrams: {
      properties: {
        name: {const: FetcherName.PolygonIOCurrencySnapshotGrams},
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
    OptionsPrice: {
      properties: {
        name: {const: FetcherName.OptionsPrice},
      },
    },
    YearnVaultTokenPrice: {
      properties: {
        name: {const: FetcherName.YearnVaultTokenPrice},
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
    RandomNumber: {
      properties: {
        name: {const: FetcherName.RandomNumber},
        params: {
          type: 'object',
          properties: {
            numBlocks: {type: 'number'},
          },
        },
      },
      additionalProperties: false,
    },
    SovrynPrice: {
      properties: {
        name: {const: FetcherName.SovrynPrice},
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
