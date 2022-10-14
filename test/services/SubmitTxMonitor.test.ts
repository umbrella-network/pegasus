import 'reflect-metadata';
import {expect} from 'chai';

import {SubmitTxMonitor} from '../../src/services/SubmitTxMonitor';
import {ChainsIds} from '../../src/types/ChainsIds';

describe('SubmitTxMonitor', () => {
  const submitTxMonitor = new SubmitTxMonitor();

  it('#wasDataSubmitted returns valid value', () => {
    expect(submitTxMonitor.wasDataSubmitted(ChainsIds.BSC, 1)).true;

    submitTxMonitor.saveTx(ChainsIds.BSC, 1, '0x1');

    expect(submitTxMonitor.wasDataSubmitted(ChainsIds.BSC, 1)).false;
    expect(submitTxMonitor.wasDataSubmitted(ChainsIds.BSC, 2)).true;
  });
});
