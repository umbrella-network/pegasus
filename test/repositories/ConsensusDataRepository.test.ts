import 'reflect-metadata';
import {expect} from 'chai';
import mongoose from 'mongoose';
import {getModelForClass} from '@typegoose/typegoose';

import '../../src/config/setupDotenv';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {ConsensusDataRepository} from '../../src/repositories/ConsensusDataRepository';
import ConsensusData from '../../src/models/ConsensusData';
import {consensusDataFactory} from '../mocks/factories/consensusDataFactory';

const defaultConsensusAssert = consensusDataFactory.build();

describe('ConsensusDataRepository', () => {
  let consensusDataRepository: ConsensusDataRepository;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    consensusDataRepository = new ConsensusDataRepository();
  });

  afterEach(async () => {
    await getModelForClass(ConsensusData).deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('#save', () => {
    describe('when save one consensus data per time', () => {
      it('saves consensus data', async () => {
        await consensusDataRepository.save({...consensusDataFactory.build()});
        const consensusData = await getModelForClass(ConsensusData).find();
        expect(consensusData).to.be.an('array').to.have.lengthOf(1);
        expect(consensusData[0]).to.deep.include(defaultConsensusAssert);
      });
    });

    describe('when save more than one consensus data per time', () => {
      before(async () => {
        await consensusDataRepository.save({...consensusDataFactory.build()});
        await consensusDataRepository.save({...consensusDataFactory.build({chainIds: ['avax']})});
      });

      it('deletes consensus data before save a new one', async () => {
        const consensusData = await getModelForClass(ConsensusData).find();
        expect(consensusData).to.be.an('array').to.have.lengthOf(1);

        expect(consensusData[0]).to.deep.include(consensusDataFactory.build({chainIds: ['avax']}));
      });
    });
  });

  describe('#read', () => {
    describe('when consensusData collection has data', () => {
      beforeEach(async () => {
        await consensusDataRepository.save({...consensusDataFactory.build()});
      });

      it('responds with consensus data', async () => {
        const consensusData = await consensusDataRepository.read();
        expect(consensusData).to.deep.include(defaultConsensusAssert);
      });
    });

    describe('when consensusData collection has no data', () => {
      beforeEach(async () => {
        await getModelForClass(ConsensusData).deleteMany({});
      });

      it('responds with undefined', async () => {
        const consensusData = await consensusDataRepository.read();
        expect(consensusData).to.eql(undefined);
      });
    });
  });
});
