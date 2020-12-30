export default {
  description: "Feeds schema for the Pegasus validator",
  type: 'object',
  propertyNames: {
    pattern: '^[A-Za-z][A-Za-z0-9-]*$',
  },
  patternProperties: {
    '.*': {type: 'object', '$ref': '#/definitions/feed'},
  },
  minProperties: 1,
  definitions: {
    feed: {
      properties: {
        discrepancy: {type: 'number'},
        precision: {type: 'number'},
        inputs: {type: 'array', minItems: 1, items: {'$ref': '#/definitions/input'}},
      },
      required: ['discrepancy', 'precision', 'inputs'],
      additionalProperties: false,
    },
    input: {
      properties: {
        fetcher: {
          oneOf: [
            {'$ref': '#/definitions/GVolImpliedVolatilityFetcher'},
            {'$ref': '#/definitions/CryptoCompareHistoDayFetcher'},
            {'$ref': '#/definitions/CryptoCompareHistoHourFetcher'},
            {'$ref': '#/definitions/CryptoComparePriceFetcher'},
          ]
        },
        calculator: {
          type: 'object',
          properties: {
            name: {enum: ['TWAP', 'VWAP', 'Identity']},
          },
          required: [],
          additionalProperties: false,
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
            symbol: {type: 'string'},
          },
          required: ['query', 'symbol'],
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
        }
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
  },
};
