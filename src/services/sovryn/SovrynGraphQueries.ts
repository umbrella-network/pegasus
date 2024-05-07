export const liquidityPoolsQuery = `
query LiquidityPoolsQuery {
    liquidityPools(where: {poolTokens_: {name_not: ""}}, first: 2) {
        id
        poolTokens {
            name
        }
        token0 {
            id
        }
        token1 {
            id
        }
    }
}
`;
