export const liquidityPoolsQuery = (poolAddress: string, skip: number): string => `
query TickPoolsQuery {
    ticks(
        where: {poolAddress: "${poolAddress.toLowerCase()}", liquidityNet_not: "0"}
        first: 1000,
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
