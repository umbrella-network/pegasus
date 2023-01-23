import 'reflect-metadata';
import {expect} from 'chai';
import mongoose from 'mongoose';
import {BigNumber} from 'ethers';
import {getModelForClass} from '@typegoose/typegoose';

import '../../src/config/setupDotenv';
import {Validator} from '../../src/types/Validator';
import {ValidatorRepository} from '../../src/repositories/ValidatorRepository';
import CachedValidator from '../../src/models/CachedValidator';
import {ChainStatus} from '../../src/types/ChainStatus';
import {chainStatusFactory} from '../mocks/factories/chainStatusFactory';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {mockedLogger} from '../mocks/logger';
import {getTestContainer} from '../helpers/getTestContainer';

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
      {id: '0xD', location: 'url2', power: BigNumber.from(2)},
      {id: '0xc', location: 'url3', power: BigNumber.from(3)},
    ];

    beforeEach(async function () {
      const chainStatus: ChainStatus = chainStatusFactory.build({
        validators: expectedValidators.map((v) => v.id),
        locations: expectedValidators.map((v) => v.location),
        powers: expectedValidators.map((v) => v.power),
      });

      await validatorRepository.cache(chainStatus);
    });

    it('expect to get list of 3 validators in order', async () => {
      const list = await validatorRepository.list();
      expect(list.length).eq(expectedValidators.length);
      expect(list).deep.eq(expectedValidators);
    });

    describe('when only 2 validators left', () => {
      const twoValidators: Validator[] = [
        {id: '0xa', location: 'url1', power: BigNumber.from(1)},
        {id: '0xc', location: 'url3', power: BigNumber.from(3)},
      ];

      beforeEach(async function () {
        const chainStatus: ChainStatus = chainStatusFactory.build({
          validators: twoValidators.map((v) => v.id),
          locations: twoValidators.map((v) => v.location),
          powers: twoValidators.map((v) => v.power),
        });

        await validatorRepository.cache(chainStatus);
      });

      it('expect to get list of 2 validators in order', async () => {
        const list = await validatorRepository.list();
        expect(list.length).eq(twoValidators.length);
        expect(list).deep.eq(twoValidators);
      });
    });
  });
});
