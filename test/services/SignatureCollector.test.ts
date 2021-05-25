import 'reflect-metadata';
import SignatureCollector from '../../src/services/SignatureCollector';
import {Container} from 'inversify';
import sinon from 'sinon';
import {mockedLogger} from '../mocks/logger';
import Blockchain from '../../src/lib/Blockchain';
import {expect} from 'chai';
import {BigNumber, Wallet} from 'ethers';
import {SignedBlock} from '../../src/types/SignedBlock';
import moxios from 'moxios';
import {leafWithAffidavit} from '../fixtures/leafWithAffidavit';
import {BlockSignerResponseWithPower} from '../../src/types/BlockSignerResponse';
import {signAffidavitWithWallet} from '../../src/utils/mining';

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
      fcd: {
        'ETH-USD': 100,
      },
      leaves: {
        'ETH-USD': 100,
      },
      signature:
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const blockSignerResponseWithPower: BlockSignerResponseWithPower[] = await signatureCollector.apply(
      block,
      affidavit,
      [{id: wallet.address, location: 'http://validator', power: BigNumber.from(1)}],
    );

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(1);
    expect(blockSignerResponseWithPower[0].signature).to.be.a('string').that.is.eq(block.signature);
  });

  it('returns no signatures if signer addresses does not match', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    mockedBlockchain.wallet = Wallet.createRandom();

    const walletOfAnotherValidator = Wallet.createRandom();

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
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const signatures = await signatureCollector.apply(block, affidavit, [
      {id: mockedBlockchain.wallet.address, location: 'http://me', power: BigNumber.from(1)},
      {id: walletOfAnotherValidator.address, location: 'http://validator', power: BigNumber.from(1)},
    ]);

    expect(signatures).to.be.an('array').with.lengthOf(1);
  });

  it('returns signature of the other validator if signer addresses match', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    mockedBlockchain.wallet = Wallet.createRandom();

    const walletOfAnotherValidator = Wallet.createRandom();
    const signatureOfAnotherValidator = await signAffidavitWithWallet(walletOfAnotherValidator, affidavit);

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
        '0x12b403e882c31f087b9f4eb9cfad1b9410e1eb4424dcd8868c6aec9748dfd24866dfdb660c8f53c9056000cfcbeeca53d9f8926ebf59deb7d291b2538a85c0f01c',
    };

    const blockSignerResponseWithPower = await signatureCollector.apply(block, affidavit, [
      {id: mockedBlockchain.wallet.address, location: 'http://me', power: BigNumber.from(1)},
      {id: walletOfAnotherValidator.address, location: 'http://validator', power: BigNumber.from(1)},
    ]);

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(2);
    expect(blockSignerResponseWithPower[0].signature).to.be.a('string').that.is.eq(block.signature);
    expect(blockSignerResponseWithPower[1].signature).to.be.a('string').that.is.eq(signatureOfAnotherValidator);
  });

  it('returns signatures from multiple validators if they are available', async () => {
    const {affidavit, fcd} = leafWithAffidavit;

    const walletOfCurrentValidator = Wallet.createRandom();
    mockedBlockchain.wallet = walletOfCurrentValidator;
    const signatureOfCurrentValidator = await signAffidavitWithWallet(walletOfCurrentValidator, affidavit);

    const walletOfSecondValidator = Wallet.createRandom();
    const signatureOfSecondValidator = await signAffidavitWithWallet(walletOfSecondValidator, affidavit);

    const walletOfThirdValidator = Wallet.createRandom();
    const signatureOfThirdValidator = await signAffidavitWithWallet(walletOfThirdValidator, affidavit);

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
      {id: mockedBlockchain.wallet.address, location: 'http://me', power: BigNumber.from(1)},
      {id: walletOfSecondValidator.address, location: 'http://second-validator', power: BigNumber.from(2)},
      {id: walletOfThirdValidator.address, location: 'http://third-validator', power: BigNumber.from(3)},
    ]);

    expect(blockSignerResponseWithPower).to.be.an('array').with.lengthOf(3);
    expect(blockSignerResponseWithPower[0].signature).to.eq(
      signatureOfCurrentValidator,
      'current validator signature must be as first',
    );
    expect(blockSignerResponseWithPower.map((r) => r.signature)).to.include(signatureOfSecondValidator);
    expect(blockSignerResponseWithPower.map((r) => r.signature)).to.include(signatureOfThirdValidator);
  });
});
