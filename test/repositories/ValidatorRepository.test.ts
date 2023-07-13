import 'reflect-metadata';
import {expect} from 'chai';
import mongoose from 'mongoose';
import {BigNumber} from 'ethers';
import {getModelForClass} from '@typegoose/typegoose';

import '../../src/config/setupDotenv';
import {Validator} from '../../src/types/Validator';
import {ValidatorRepository} from '../../src/repositories/ValidatorRepository';
import CachedValidator from '../../src/models/CachedValidator';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {mockedLogger} from '../mocks/logger';
import {getTestContainer} from '../helpers/getTestContainer';
import {ChainsIds} from '../../src/types/ChainsIds';

describe('ValidatorRepository', () => {
  let validatorRepository: ValidatorRepository;

  before(async () => {
    const container = getTestContainer();
    container.rebind('Logger').toConstantValue(mockedLogger);

    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
    await getModelForClass(CachedValidator).deleteMany({});

    container.bind(ValidatorRepository).to(ValidatorRepository);

    validatorRepository = container.get(ValidatorRepository);
  });

  after(async () => {
    await getModelForClass(CachedValidator).deleteMany({});
    await mongoose.connection.close();
  });

  describe('when 3 validators cached', () => {
    const expectedValidators: Validator[] = [
      {id: '0xa', location: 'url1', power: BigNumber.from(1)},
      {id: '0xB', location: 'url2', power: BigNumber.from(2)},
      {id: '0xc', location: 'url3', power: BigNumber.from(3)},
    ];

    beforeEach(async function () {
      await validatorRepository.cache(ChainsIds.LINEA, expectedValidators);
    });

    it('expect to get list of 3 validators in order', async () => {
      const list = await validatorRepository.list(undefined);
      expect(list.length).eq(expectedValidators.length);
      expect(list).deep.eq(expectedValidators);
    });

    describe('when only 2 validators left', () => {
      const twoValidators: Validator[] = [
        {id: '0xa', location: 'url1', power: BigNumber.from(1)},
        {id: '0xc', location: 'url3', power: BigNumber.from(3)},
      ];

      beforeEach(async function () {
        await validatorRepository.cache(ChainsIds.LINEA, twoValidators);
      });

      it('expect to get list of 2 validators in order', async () => {
        const list = await validatorRepository.list(undefined);
        expect(list.length).eq(twoValidators.length);
        expect(list).deep.eq(twoValidators);
      });
    });
  });
});
