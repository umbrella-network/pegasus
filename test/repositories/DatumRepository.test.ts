import 'reflect-metadata';
import {expect} from 'chai';

import {DatumRepository} from '../../src/repositories/DatumRepository';
import {getTestContainer} from '../helpers/getTestContainer';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {getModelForClass, mongoose} from '@typegoose/typegoose';
import {Datum} from '../../src/models/Datum';

describe('DatumRepository', () => {
  let datumRepository: DatumRepository;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(() => {
    const container = getTestContainer();

    container.bind(DatumRepository).to(DatumRepository);

    datumRepository = container.get(DatumRepository);
  });

  afterEach(async () => {
    await getModelForClass(Datum).deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('saveBatch', () => {
    describe('when duplicated data is given', () => {
      it('saves only once', async () => {
        const timestamp = new Date();
        const datum = {source: 'test1', symbol: 'fsym1-tsym1', value: '200', timestamp};

        const data = [datum, datum];

        await datumRepository.saveBatch(data);

        const priceCount = await getModelForClass(Datum).countDocuments({}).exec();

        expect(priceCount).to.be.eq(1);
      });
    });

    describe('when diferent data is given', () => {
      it('calls aggregator with proper data format', async () => {
        const timestamp = new Date();
        const datum1 = {source: 'test1', symbol: 'fsym1-tsym1', value: '200', timestamp};
        const datum2 = {source: 'test2', symbol: 'fsym2-tsym2', value: '300', timestamp};

        const data = [datum1, datum2];

        await datumRepository.saveBatch(data);

        const priceCount = await getModelForClass(Datum).countDocuments({}).exec();

        expect(priceCount).to.be.eq(2);
      });
    });
  });
});
