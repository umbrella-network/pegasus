import 'reflect-metadata';
import chai from 'chai';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';

import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {PriceDataPayload, PriceDataRepository, PriceValueType} from '../../src/repositories/PriceDataRepository.js';
import {DeviationSignerRepository} from '../../src/repositories/DeviationSignerRepository.js';
import {PriceDataModel} from '../../src/models/PriceDataModel.js';
import {FetcherName} from '../../src/types/fetchers.js';
import PriceSignerService from '../../src/services/PriceSignerService.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import Settings from '../../src/types/Settings.js';
import '../../src/config/setupDotenv.js';
import {ethers} from 'ethers';

const {expect} = chai;

describe('PriceDataRepository', () => {
  let priceDataRepository: PriceDataRepository;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    const settings = {
      blockchain: {
        multiChains: {
          rootstock: {},
        },
        wallets: {
          evm: {
            privateKey: process.env.VALIDATOR_PRIVATE_KEY as string,
          },
        },
      },
      environment: 'testing',
    } as Settings;

    const container = getTestContainer();
    container.bind(PriceDataRepository).toSelf();
    container.bind(PriceSignerService).toSelf();
    container.bind(DeviationSignerRepository).toSelf();
    container.rebind('Settings').toConstantValue(settings);
    priceDataRepository = container.get(PriceDataRepository);
  });

  beforeEach(async () => {
    await getModelForClass(PriceDataModel).deleteMany({});
  });

  after(async () => {
    await getModelForClass(PriceDataModel).deleteMany({});
    await mongoose.connection.close();
  });

  it('saves a price in the database', async () => {
    const payload: PriceDataPayload[] = [
      {
        fetcher: FetcherName.SOVRYN_PRICE,
        value: '2912',
        valueType: PriceValueType.Price,
        timestamp: 0,
        feedBase: 'BTC',
        feedQuote: 'USD',
        fetcherSource: '',
      },
    ];
    await priceDataRepository.savePrices(payload);

    const result = await priceDataRepository.latestPrice('BTC', 'USD');

    expect(result).to.have.length(1);
    expect(result[0].hashVersion).to.be.eq(1);

    const {priceHash, signature, signer} = result[0];
    const expectedHash = ethers.utils.id(priceDataRepository.createMessageToSign(payload[0], 1));
    expect(priceHash).to.be.eq(expectedHash);

    const priceHashArray = ethers.utils.arrayify(priceHash);
    const address = ethers.utils.verifyMessage(priceHashArray, signature);
    expect(address).to.be.eq(signer);
  });
});
