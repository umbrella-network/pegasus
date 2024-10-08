import 'reflect-metadata';
import chai from 'chai';
import mongoose from 'mongoose';
import {BigNumber} from 'ethers';
import {getModelForClass} from '@typegoose/typegoose';

import '../../src/config/setupDotenv.js';
import {Validator} from '../../src/types/Validator.js';
import {ValidatorRepository} from '../../src/repositories/ValidatorRepository.js';
import CachedValidator from '../../src/models/CachedValidator.js';
import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {BlockchainType} from '../../src/types/Settings.js';
import {ReleasesResolver} from '../../src/services/files/ReleasesResolver.js';

const {expect} = chai;

describe('ValidatorRepository', () => {
  let validatorRepository: ValidatorRepository;
  let releasesResolver: ReleasesResolver;

  before(async () => {
    const container = getTestContainer();

    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
    await getModelForClass(CachedValidator).deleteMany({});

    container.bind(ValidatorRepository).to(ValidatorRepository);
    container.bind(ReleasesResolver).to(ReleasesResolver);

    validatorRepository = container.get(ValidatorRepository);
    releasesResolver = container.get(ReleasesResolver);

    await releasesResolver.mappingRepository.set(`${releasesResolver.RELEASE_PREFIX}leaderSelectorV2`, '0');
  });

  after(async () => {
    await getModelForClass(CachedValidator).deleteMany({});
    await mongoose.connection.close();
  });

  describe('when 3 validators cached', () => {
    const expectedValidators: Validator[] = [
      {id: '0xa', location: 'url1', power: BigNumber.from(1)},
      {id: '0xb', location: 'url2', power: BigNumber.from(2)},
      {id: '0xc', location: 'url3', power: BigNumber.from(3)},
    ];

    beforeEach(async function () {
      await validatorRepository.cache(ChainsIds.LINEA, expectedValidators);
    });

    it('expect to get list of 3 validators in order', async () => {
      const list = await validatorRepository.list(undefined, BlockchainType.ON_CHAIN);
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
        const list = await validatorRepository.list(undefined, BlockchainType.LAYER2);
        expect(list.length).eq(twoValidators.length);
        expect(list).deep.eq(twoValidators);
      });
    });
  });
});
