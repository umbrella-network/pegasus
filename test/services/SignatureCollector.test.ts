import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';
import {BigNumber, Wallet} from 'ethers';
import moxios from 'moxios';

import SignatureCollector from '../../src/services/SignatureCollector.js';
import Blockchain from '../../src/lib/Blockchain.js';
import {SignedBlock} from '../../src/types/SignedBlock.js';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit.js';
import {BlockSignerResponseWithPower} from '../../src/types/BlockSignerResponse.js';
import {signAffidavitWithWallet} from '../../src/utils/mining.js';
import {ValidatorStatusChecker} from '../../src/services/ValidatorStatusChecker.js';
import {mockIWallet} from '../helpers/mockIWallet.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import Settings from '../../src/types/Settings.js';

const {expect} = chai;

describe('SignatureCollector', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let signatureCollector: SignatureCollector;
  const leaderWallet = Wallet.createRandom();

  beforeEach(async () => {
    moxios.install();

    const settings = {
      signatureTimeout: 5000,
      blockchain: {
        wallets: {
          evm: {
            privateKey: leaderWallet.privateKey,
          },
        },
      },
    };
    const container = getTestContainer(settings as unknown as Settings);

    mockedBlockchain = sinon.createStubInstance(Blockchain);

    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(ValidatorStatusChecker).toSelf();
    container.bind(SignatureCollector).toSelf();

    signatureCollector = container.get(SignatureCollector);

    mockedBlockchain.wallet = mockIWallet(leaderWallet);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it("returns block's signature if the only validator is the current one", async () => {
    const affidavit = '0xad5c2e48ca79dfaf8defc323b0d895ecf055623a005c73dbae657444b0af9172';

    const block: SignedBlock = {
      dataTimestamp: 10,
      fcd: {
        'ETH-USD': '0xABCD',
      },
      leaves: {
        'ETH-USD': '0xABCD',
      },
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000' +
        'cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const blockSignerResponseWithPower: BlockSignerResponseWithPower[] = await signatureCollector.apply(
      block,
      affidavit,
      [{id: leaderWallet.address.toLowerCase(), location: 'http://me', power: BigNumber.from(1)}],
    );

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(1);
    expect(blockSignerResponseWithPower[0].signature).to.be.a('string').that.is.eq(block.signature);
  });

  it('returns no external signatures if signer addresses does not match', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    const walletOfAnotherValidator = Wallet.createRandom();

    moxios.stubRequest('http://validator/info?ping=1', {
      status: 200,
      response: {data: 'OK'},
    });

    moxios.stubRequest('http://validator/signature', {
      status: 200,
      response: {
        // a wrong signature, so the addresses of signers will not match
        data: `0x${'0'.repeat(130)}`,
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      fcd,
      leaves: fcd,
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000' +
        'cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const signatures = await signatureCollector.apply(block, affidavit, [
      {id: (await mockedBlockchain.wallet.address()).toLowerCase(), location: 'http://me', power: BigNumber.from(1)},
      {id: walletOfAnotherValidator.address.toLowerCase(), location: 'http://validator', power: BigNumber.from(1)},
    ]);

    expect(signatures).to.be.an('array').with.lengthOf(1);
  });

  it('returns signature of the other validator if signer addresses match', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    const walletOfAnotherValidator = Wallet.createRandom();
    const signatureOfAnotherValidator = await signAffidavitWithWallet(walletOfAnotherValidator, affidavit);

    moxios.stubRequest('http://validator/info?ping=1', {
      status: 200,
      response: {data: 'OK'},
    });

    moxios.stubRequest('http://validator/signature', {
      status: 200,
      response: {
        signature: signatureOfAnotherValidator,
        discrepancies: [],
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      fcd: fcd,
      leaves: fcd,
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000' +
        'cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const blockSignerResponseWithPower = await signatureCollector.apply(block, affidavit, [
      {id: (await mockedBlockchain.wallet.address()).toLowerCase(), location: 'http://me', power: BigNumber.from(1)},
      {id: walletOfAnotherValidator.address.toLowerCase(), location: 'http://validator', power: BigNumber.from(1)},
    ]);

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(2);
    expect(blockSignerResponseWithPower[0].signature).to.be.a('string').that.is.eq(block.signature);
    expect(blockSignerResponseWithPower[1].signature).to.be.a('string').that.is.eq(signatureOfAnotherValidator);
  });

  it('returns signatures from multiple validators if they are available', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    const signatureOfCurrentValidator = await signAffidavitWithWallet(leaderWallet, affidavit);

    const walletOfSecondValidator = Wallet.createRandom();
    const signatureOfSecondValidator = await signAffidavitWithWallet(walletOfSecondValidator, affidavit);

    const walletOfThirdValidator = Wallet.createRandom();
    const signatureOfThirdValidator = await signAffidavitWithWallet(walletOfThirdValidator, affidavit);

    moxios.stubRequest('http://second-validator/info?ping=1', {
      status: 200,
      response: {data: 'OK'},
    });

    moxios.stubRequest('http://third-validator/info?ping=1', {
      status: 200,
      response: {data: 'OK'},
    });

    moxios.stubRequest('http://second-validator/signature', {
      status: 200,
      response: {
        signature: signatureOfSecondValidator,
        discrepancies: [],
      },
    });

    moxios.stubRequest('http://third-validator/signature', {
      status: 200,
      response: {
        signature: signatureOfThirdValidator,
        discrepancies: [],
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      fcd: fcd,
      leaves: fcd,
      signature: signatureOfCurrentValidator,
    };

    const blockSignerResponseWithPower = await signatureCollector.apply(block, affidavit, [
      {id: (await mockedBlockchain.wallet.address()).toLowerCase(), location: 'http://me', power: BigNumber.from(1)},
      {
        id: walletOfSecondValidator.address.toLowerCase(),
        location: 'http://second-validator',
        power: BigNumber.from(2),
      },
      {id: walletOfThirdValidator.address.toLowerCase(), location: 'http://third-validator', power: BigNumber.from(3)},
    ]);

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(3);
    expect(blockSignerResponseWithPower[0].signature).to.eq(
      signatureOfCurrentValidator,
      'current validator signature must be as first',
    );
    expect(blockSignerResponseWithPower.map((r) => r.signature)).to.include(signatureOfSecondValidator);
    expect(blockSignerResponseWithPower.map((r) => r.signature)).to.include(signatureOfThirdValidator);
  });

  it('ignores signatures from validators if status check fails', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    const signatureOfCurrentValidator = await signAffidavitWithWallet(leaderWallet, affidavit);

    const walletOfSecondValidator = Wallet.createRandom();
    const signatureOfSecondValidator = await signAffidavitWithWallet(walletOfSecondValidator, affidavit);

    const walletOfThirdValidator = Wallet.createRandom();
    const signatureOfThirdValidator = await signAffidavitWithWallet(walletOfThirdValidator, affidavit);

    moxios.stubRequest('http://second-validator/info?ping=1', {
      status: 500,
      response: {data: ''},
    });

    moxios.stubRequest('http://third-validator/info?ping=1', {
      status: 200,
      response: {data: 'error: something'},
    });

    moxios.stubRequest('http://second-validator/signature', {
      status: 200,
      response: {
        signature: signatureOfSecondValidator,
        discrepancies: [],
      },
    });

    moxios.stubRequest('http://third-validator/signature', {
      status: 200,
      response: {
        signature: signatureOfThirdValidator,
        discrepancies: [],
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      fcd: fcd,
      leaves: fcd,
      signature: signatureOfCurrentValidator,
    };

    const blockSignerResponseWithPower = await signatureCollector.apply(block, affidavit, [
      {id: (await mockedBlockchain.wallet.address()).toLowerCase(), location: 'http://me', power: BigNumber.from(1)},
      {
        id: walletOfSecondValidator.address.toLowerCase(),
        location: 'http://second-validator',
        power: BigNumber.from(2),
      },
      {id: walletOfThirdValidator.address.toLowerCase(), location: 'http://third-validator', power: BigNumber.from(3)},
    ]);

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(1);
  });
});
