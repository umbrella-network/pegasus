import 'reflect-metadata';
import SignatureCollector from '../../src/services/SignatureCollector';
import {Container} from 'inversify';
import sinon from 'sinon';
import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import {expect} from 'chai';
import {Wallet} from 'ethers';
import {SignedBlock} from '../../src/types/SignedBlock';
import moxios from 'moxios';
import BlockMinter from '../../src/services/BlockMinter';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';

describe('SignatureCollector', () => {
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let signatureCollector: SignatureCollector;

  beforeEach(async () => {
    moxios.install();

    const container = new Container();

    const settings = {
      signatureTimeout: 5000,
    };

    mockedBlockchain = sinon.createStubInstance(Blockchain);

    container.bind('Settings').toConstantValue(settings);
    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind(Blockchain).toConstantValue(mockedBlockchain);
    container.bind(SignatureCollector).toSelf();

    signatureCollector = container.get(SignatureCollector);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it("returns block's signature if the only validator is the current one", async () => {
    const affidavit = '0xad5c2e48ca79dfaf8defc323b0d895ecf055623a005c73dbae657444b0af9172';

    const wallet = Wallet.createRandom();
    mockedBlockchain.wallet = wallet;

    const block: SignedBlock = {
      dataTimestamp: 10,
      blockHeight: 1,
      fcd: {
        'ETH-USD': 100,
      },
      leaves: {
        'ETH-USD': 100,
      },
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const signatures = await signatureCollector.apply(block, affidavit, [
      {id: wallet.address, location: 'http://validator'},
    ]);

    expect(signatures).to.be.an('array').with.lengthOf(1);
    expect(signatures[0]).to.be.a('string').that.is.eq(block.signature);
  });

  it('returns no signatures if signer addresses does not match', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    mockedBlockchain.wallet = Wallet.createRandom();

    const walletOfAnotherValidator = Wallet.createRandom();

    moxios.stubRequest('http://validator/signature', {
      status: 200,
      response: {
        // a wrong signature, so the addresses of signers will not match
        data:
          '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      blockHeight: 1,
      fcd,
      leaves: fcd,
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const signatures = await signatureCollector.apply(block, affidavit, [
      {id: walletOfAnotherValidator.address, location: 'http://validator'},
    ]);

    expect(signatures).to.be.an('array').with.lengthOf(1);
  });

  it('returns signature of the other validator if signer addresses match', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    mockedBlockchain.wallet = Wallet.createRandom();

    const walletOfAnotherValidator = Wallet.createRandom();
    const signatureOfAnotherValidator = await BlockMinter.signAffidavitWithWallet(walletOfAnotherValidator, affidavit);

    moxios.stubRequest('http://validator/signature', {
      status: 200,
      response: {
        data: signatureOfAnotherValidator,
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      blockHeight: 1,
      fcd: fcd,
      leaves: fcd,
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const signatures = await signatureCollector.apply(block, affidavit, [
      {id: walletOfAnotherValidator.address, location: 'http://validator'},
    ]);

    expect(signatures).to.be.an('array').with.lengthOf(2);
    expect(signatures[1]).to.be.a('string').that.is.eq(signatureOfAnotherValidator);
  });

  it('returns signatures from multiple validators if they are available', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    const walletOfCurrentValidator = Wallet.createRandom();
    mockedBlockchain.wallet = walletOfCurrentValidator;
    const signatureOfCurrentValidator = await BlockMinter.signAffidavitWithWallet(walletOfCurrentValidator, affidavit);

    const walletOfSecondValidator = Wallet.createRandom();
    const signatureOfSecondValidator = await BlockMinter.signAffidavitWithWallet(walletOfSecondValidator, affidavit);

    const walletOfThirdValidator = Wallet.createRandom();
    const signatureOfThirdValidator = await BlockMinter.signAffidavitWithWallet(walletOfThirdValidator, affidavit);

    moxios.stubRequest('http://second-validator/signature', {
      status: 200,
      response: {
        data: signatureOfSecondValidator,
      },
    });

    moxios.stubRequest('http://third-validator/signature', {
      status: 200,
      response: {
        data: signatureOfThirdValidator,
      },
    });

    const block: SignedBlock = {
      dataTimestamp: 10,
      blockHeight: 1,
      fcd: fcd,
      leaves: fcd,
      signature: signatureOfCurrentValidator,
    };

    const signatures = await signatureCollector.apply(block, affidavit, [
      {id: walletOfSecondValidator.address, location: 'http://second-validator'},
      {id: walletOfThirdValidator.address, location: 'http://third-validator'},
    ]);

    expect(signatures).to.be.an('array').with.lengthOf(3);
    expect(signatures[0]).to.eq(signatureOfCurrentValidator, 'current validator signature must be as first');
    expect(signatures).to.include(signatureOfSecondValidator);
    expect(signatures).to.include(signatureOfThirdValidator);
  });
});
