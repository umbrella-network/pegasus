import yargs from 'yargs';
import axios from 'axios';
import dotenv from 'dotenv';
import {JSONPath} from 'jsonpath-plus';

dotenv.config();

import settings from '../config/settings';

const argv = yargs(process.argv.slice(2)).options({
  maxTickers: {type: 'number', default: 2000},
  maxPairs: {type: 'number', default: 10},
  minVolumeUSD: {type: 'number', default: 100000},
}).argv;

/**
 * This script selects the most popular crypto pairs (by volume) based on cryptocompare data.
 */
async function main() {
  const fetchTopMarketCap = async (limit: number, page: number, tsym: string) => {
    const sourceUrl = `https://min-api.cryptocompare.com/data/top/mktcapfull?limit=${limit}&page=${page}&tsym=${tsym}`;

    const response = await axios.get(sourceUrl, {
      headers: {Authorization: `Apikey ${settings.api.cryptocompare.apiKey}`},
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return response.data;
  };

  const fetchTopPairs = async (limit: number, fsym: string) => {
    const sourceUrl = `https://min-api.cryptocompare.com/data/top/pairs?fsym=${fsym}&limit=${limit}`;

    const response = await axios.get(sourceUrl, {
      headers: {Authorization: `Apikey ${settings.api.cryptocompare.apiKey}`},
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return response.data;
  };

  const fetchUSDPrices = async (fsyms: string[]) => {
    const sourceUrl = `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${fsyms.join(',')}&tsyms=USD`;

    const response = await axios.get(sourceUrl, {
      headers: {Authorization: `Apikey ${settings.api.cryptocompare.apiKey}`},
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    const result = response.data;

    return Object.keys(result).reduce((map, symbol) => {
      map[symbol] = result[symbol]['USD'];
      return map;
    }, {} as {[key: string]: number});
  };

  // eslint-disable-next-line
  const unique: {[key: string]: any} = {};
  const volumes = [];

  for (let page = 0; page < 100; ++page) {
    if (volumes.length > argv.maxTickers) {
      break;
    }

    const symbols = JSONPath({json: await fetchTopMarketCap(50, page, 'USD'), path: '$.[:0].CoinInfo.Name'});
    const prices = await fetchUSDPrices(symbols);

    for (let s = 0; s < symbols.length; ++s) {
      if (volumes.length > argv.maxTickers) {
        break;
      }

      const symbol = symbols[s];
      const pairs = JSONPath({json: await fetchTopPairs(argv.maxPairs, symbol), path: '$.Data.[:0]'});

      for (let p = 0; p < pairs.length; ++p) {
        const {volume24h, fromSymbol, toSymbol} = pairs[p];

        if (volume24h > 0) {
          const volumeAdjusted = volume24h * prices[symbol];
          if (volumeAdjusted > argv.minVolumeUSD) {
            const ticker = `${fromSymbol}-${toSymbol}`;

            if (unique[ticker]) {
              if (unique[ticker].volume < volumeAdjusted) {
                unique[ticker].volume = volumeAdjusted;
              }
              continue;
            }

            let {price} = pairs[p],
              precision = 2;
            while (price < 10) {
              price *= 10;
              precision += 1;
            }

            volumes.push(
              (unique[ticker] = {
                fromSymbol,
                toSymbol,
                volume: volumeAdjusted,
                precision,
              }),
            );

            console.log(`num: ${volumes.length}`);
          }
        }
      }
    }
  }

  volumes.sort(({volume: volume1}, {volume: volume2}) => volume2 - volume1);

  volumes.forEach(({toSymbol, fromSymbol, precision}) => {
    const ticker = `${fromSymbol}-${toSymbol}`;

    console.log(`${ticker}:
  discrepancy: 0.1
  precision: ${precision}
  inputs:
    - fetcher:
        name: CryptoComparePriceWS
        params:
          fsym: ${fromSymbol}
          tsym: ${toSymbol}\n`);
  });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
