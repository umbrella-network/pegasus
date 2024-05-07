export const SovrynGraphPoolsResponseJSONSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        liquidityPools: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
              },
              poolTokens: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                    },
                  },
                  required: ['name'],
                },
              },
              token0: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                },
                required: ['id'],
              },
              token1: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                  },
                },
                required: ['id'],
              },
            },
            required: ['id', 'poolTokens', 'token0', 'token1'],
          },
        },
      },
      required: ['liquidityPools'],
    },
  },
  required: ['data'],
};
