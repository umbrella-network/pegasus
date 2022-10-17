import 'reflect-metadata';
import fs from 'fs';
import {expect} from 'chai';

import {SubmitTxMonitor} from '../../src/services/SubmitTxMonitor';
import {ChainsIds} from '../../src/types/ChainsIds';
import sinon from 'sinon';

describe('SubmitTxMonitor', () => {
  let fsStub: sinon.SinonStubbedInstance<typeof fs>;

  before(() => {
    fsStub = sinon.stub(fs);
  });

  afterEach(() => {
    sinon.restore();
  });

  const submitTxMonitor = new SubmitTxMonitor();

  it('#wasDataSubmitted returns valid value', () => {
    fsStub.existsSync.returns(true);
    fsStub.readFileSync.returns(JSON.stringify({dataTimestamp: 1}));

    expect(submitTxMonitor.wasDataSubmitted(ChainsIds.BSC, 1)).true;

    submitTxMonitor.saveTx(ChainsIds.BSC, 1, '0x1');
    fsStub.readFileSync.returns(JSON.stringify({dataTimestamp: 2}));

    expect(submitTxMonitor.wasDataSubmitted(ChainsIds.BSC, 1)).false;
    expect(submitTxMonitor.wasDataSubmitted(ChainsIds.BSC, 2)).true;
  });
});
