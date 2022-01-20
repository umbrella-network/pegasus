import 'dotenv';
import yargs from 'yargs';
import {EventEmitter} from 'events';
import {getModelForClass} from '@typegoose/typegoose';
import axios from 'axios';

import './boot';
import Application from './lib/Application';
import FeedProcessor from './services/FeedProcessor';
import loadFeeds from './services/loadFeeds';
import Settings from "./types/Settings";
import Block from './models/Block';
import GasEstimator from './services/GasEstimator';
import PolygonIOPriceInitializer from './services/PolygonIOPriceInitializer';
import CryptoCompareWSInitializer from './services/CryptoCompareWSInitializer';
import KaikoPriceStreamInitializer from './services/KaikoPriceStreamInitializer';
import TimeService from './services/TimeService';
import {calcNumberDiscrepancy} from './utils/math';

const argv = yargs(process.argv.slice(2)).options({
  task: { type: 'string', demandOption: true },
}).argv;

async function testFeeds(settings: Settings): Promise<void> {
  await Application.get(PolygonIOPriceInitializer).apply();
  await Application.get(CryptoCompareWSInitializer).apply();
  await Application.get(KaikoPriceStreamInitializer).apply();

  const feeds = await loadFeeds(settings.feedsFile);

  await new Promise((resolve) => setTimeout(resolve, 2000));

  const leaves = await Application.get(FeedProcessor).apply(new TimeService().apply(), feeds);
  console.log('Feeds: ', leaves);
}

async function dbCleanUp(): Promise<void> {
  const blockModel = getModelForClass(Block);
  await blockModel.collection.deleteMany({});
}

async function estimateGasPrice(): Promise<void> {
  await Application.get(GasEstimator).apply();
}

async function compareValidators(validator1: string, validator2: string): Promise<void> {
  console.log(`Comparing ${validator1} and ${validator2}`);
  const getJSON = async (url: string) => {
    const res = await axios.get(url);
    return res.data;
  };

  const compareObjects = async (obj1: any, obj2: any) => {
    const map2 = obj2.reduce((map: any, {symbol, value}: any) => {
      map[symbol] = value;
      return map;
    }, {});

    obj1.forEach(({symbol, value: value1}: any) => {
      const value2 = map2[symbol];

      const disc = calcNumberDiscrepancy(value1, value2) * 100;

      if (disc > 1) {
        console.log(`${symbol}: ${disc}; ${value1} vs ${value2}`);
      }
    });
  };

  console.log('cryptocompare');
  const [c1, c2] = await Promise.all([
    getJSON(`${validator1}/debug/price-aggregator/cryptocompare/latest`),
    getJSON(`${validator2}/debug/price-aggregator/cryptocompare/latest`),
  ]);
  await compareObjects(c1, c2);

  console.log('polygon/crypto');
  const [b1, b2] = await Promise.all([
    getJSON(`${validator1}/debug/price-aggregator/polygon/crypto/latest`),
    getJSON(`${validator2}/debug/price-aggregator/polygon/crypto/latest`),
  ]);
  await compareObjects(b1, b2);

  console.log('polygon/stock');
  const [s1, s2] = await Promise.all([
    getJSON(`${validator1}/debug/price-aggregator/polygon/stock/latest`),
    getJSON(`${validator2}/debug/price-aggregator/polygon/stock/latest`),
  ]);
  await compareObjects(s1, s2);

  console.log('kaiko');
  const [k1, k2] = await Promise.all([
    getJSON(`${validator1}/debug/price-aggregator/kaiko/latest`),
    getJSON(`${validator2}/debug/price-aggregator/kaiko/latest`),
  ]);
  await compareObjects(k1, k2);
}

async function compareDebug(): Promise<void> {
  await compareValidators('http://localhost:3000', 'https://umb.anorak.technology');
}

const ev = new EventEmitter();
ev.on('done', () => process.exit());

(async () => {
  const settings: Settings = Application.get('Settings');

  switch (argv.task) {
    case 'db:cleanup': {
      await dbCleanUp();
      ev.emit('done');
      break;
    }
    case 'test:feeds': {
      await testFeeds(settings);
      ev.emit('done');
      break;
    }

    case 'estimate:gas-price': {
      await estimateGasPrice();
      ev.emit('done');
      break;
    }
    case 'compare-debug': {
      await compareDebug();
      ev.emit('done');
      break;
    }
  }
})();

