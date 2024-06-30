import {Token} from '@uniswap/sdk-core';

export function sortTokensByAddress(token0: Token, token1: Token) {
  return token0.address.toLowerCase() < token1.address.toLowerCase() ? [token0, token1] : [token1, token0];
}
