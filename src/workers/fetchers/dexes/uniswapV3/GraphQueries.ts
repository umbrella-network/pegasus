export const liquidityPoolsSubgraphQuery = (poolAddress: string, limit: number, skip: number): string => `
query TickPoolsQuery {
    ticks(
        where: {poolAddress: "${poolAddress.toLowerCase()}", liquidityNet_not: "0"}
        first: ${limit},
        orderBy: tickIdx,
        orderDirection: asc,
        skip: ${skip}
      ) {
        tickIdx
        liquidityGross
        liquidityNet
      }
}
`;

export type SubgraphPoolResult = {
  id: string;
  feeTier: number;
  token1: {
    id: string;
    symbol: string;
  };
  token0: {
    id: string;
    symbol: string;
  };
};

export const uniswapPoolsSubgraphQuery = (
  tokens: {base: string; quote: string}[],
  limit: number,
  skip: number,
): string => {
  const whereTokens = tokens
    .map(({base, quote}) => {
      return {base: base.toLowerCase(), quote: quote.toLowerCase()};
    })
    .map(({base, quote}) => {
      return base < quote ? {token0: base, token1: quote} : {token0: quote, token1: base};
    })
    .map(({token0, token1}) => `{ token0: "${token0}", token1: "${token1}" }`)
    .join(', ');

  return `
query SubgraphPoolsQuery {
  pools(
    first: ${limit}
    skip: ${skip}
    where: {
      or: [${whereTokens}]
    }
  ) {
    id
    feeTier
    token1 {
      id
      symbol
    }
    token0 {
      id
      symbol
    }
  }
}
`;
};

export type SubgraphLiquidityResult = {
  id: string;
  totalValueLockedToken0: number;
  totalValueLockedToken1: number;
  token0: {
    id: string;
  };
  token1: {
    id: string;
  };
};

export const uniswapLiquiditySubgraphQuery = (pools: string[], limit: number, skip: number): string => {
  const idIn = pools.map((p) => p.toLowerCase()).join(', ');

  return `
query SubgraphPoolsLiquidityQuery {
  pools(
    first: ${limit}
    skip: ${skip}
    where: {id: "", id_in: "[${idIn}]"}
  ) {
    id
    totalValueLockedToken0
    totalValueLockedToken1
    token0 {
      id
    }
    token1 {
      id
    }
  }
}
`;
};
