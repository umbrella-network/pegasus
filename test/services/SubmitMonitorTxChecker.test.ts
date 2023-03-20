import 'reflect-metadata';
import {expect} from 'chai';
import mongoose from 'mongoose';

import {ChainsIds} from '../../src/types/ChainsIds';
import {MappingRepository} from '../../src/repositories/MappingRepository';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {SubmitSaver} from '../../src/services/SubmitMonitor/SubmitSaver';
import {SubmitTxChecker} from '../../src/services/SubmitMonitor/SubmitTxChecker';
import {SubmitTxKeyResolver} from '../../src/services/SubmitMonitor/SubmitTxKeyResolver';
import {getTestContainer} from '../helpers/getTestContainer';
import {LastSubmitResolver} from '../../src/services/SubmitMonitor/LastSubmitResolver';

describe('SubmitTxMonitor', () => {
  let submitSaver: SubmitSaver;
  let submitTxChecker: SubmitTxChecker;

  const t = Date.now();

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    const container = getTestContainer();
    container.bind(LastSubmitResolver).to(LastSubmitResolver);
    container.bind(MappingRepository).to(MappingRepository);
    container.bind(SubmitTxChecker).to(SubmitTxChecker);
    container.bind(SubmitTxKeyResolver).toConstantValue(SubmitTxKeyResolver);

    submitTxChecker = container.get(SubmitTxChecker);
    submitSaver = container.get(SubmitSaver);
  });

  it('#SubmitTxChecker returns valid value', async () => {
    expect(await submitTxChecker.apply(ChainsIds.BSC, t)).false;

    await submitSaver.apply(ChainsIds.BSC, t, '0x123');

    expect(await submitTxChecker.apply(ChainsIds.BSC, t)).true;
    expect(await submitTxChecker.apply(ChainsIds.BSC, t + 1)).false;
  });

  it('#SubmitTxChecker returns true for all previous timestamps', async () => {
    await submitSaver.apply(ChainsIds.BSC, t, '');

    expect(await submitTxChecker.apply(ChainsIds.BSC, 0)).true;
    expect(await submitTxChecker.apply(ChainsIds.BSC, t - 1)).true;
  });
});
