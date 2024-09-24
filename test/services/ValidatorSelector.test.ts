/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import chai from 'chai';
import {BigNumber} from 'ethers';

import {Validator} from '../../src/types/Validator.js';
import CachedValidator from '../../src/models/CachedValidator.js';
import {ValidatorsSelector} from '../../src/services/ValidatorsSelector.js';
import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {getTestContainer} from '../helpers/getTestContainer.js';

const {expect} = chai;

describe.only('ValidatorSelector', () => {
  let vs: ValidatorsSelector;

  before(() => {
    loadTestEnv();

    const container = getTestContainer();
    vs = container.get(ValidatorsSelector);
  });

  it('when no evm validators', async () => {
    const evmValidators: Record<string, Validator> = {};
    const validators: CachedValidator[] = [];

    expect(await vs.apply(evmValidators, validators)).to.eql([]);
  });

  it('select common validators case1', async () => {
    const evmValidators: Record<string, Validator> = {
      'https://validator2.umb.network': {
        id: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: BigNumber.from(1),
        location: 'https://validator2.umb.network',
      },
      'https://umb-api.staking.rocks': {
        id: '0x2f85824b2b38f179e451988670935d315b5b9692',
        power: BigNumber.from(1),
        location: 'https://umb-api.staking.rocks',
      },
    };

    const validators: CachedValidator[] = [
      {
        location: 'https://validator.umb.network',
        address: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        location: 'https://validator2.umb.network',
        address: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        address: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        location: 'https://umbrella.artemahr.tech',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
    ];

    const expectedValidators: Validator[] = [
      {
        id: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: BigNumber.from(1),
        location: 'https://validator2.umb.network',
      },
    ];

    expect(await vs.apply(evmValidators, validators)).to.eql(expectedValidators);
  });

  it('select common validators case2', async () => {
    const evmValidators: Record<string, Validator> = {
      'https://validator2.umb.network': {
        id: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: BigNumber.from(1),
        location: 'https://validator2.umb.network',
      },
      'https://validator.umb.network': {
        id: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: BigNumber.from(1),
        location: 'https://validator.umb.network',
      },
      'https://umb-api.staking.rocks': {
        id: '0x2f85824b2b38f179e451988670935d315b5b9692',
        power: BigNumber.from(1),
        location: 'https://umb-api.staking.rocks',
      },
    };

    const validators: CachedValidator[] = [
      {
        location: 'https://validator.umb.network',
        address: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        location: 'https://validator2.umb.network',
        address: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        address: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        location: 'https://umbrella.artemahr.tech',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
    ];

    const expectedValidators: Validator[] = [
      {
        id: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: BigNumber.from(1),
        location: 'https://validator.umb.network',
      },
      {
        id: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: BigNumber.from(1),
        location: 'https://validator2.umb.network',
      },
    ];

    expect(await vs.apply(evmValidators, validators)).to.eql(expectedValidators);
  });

  it('select common validators case3 - with chains', async () => {
    const evmValidators: Record<string, Validator> = {
      'https://validator2.umb.network': {
        id: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: BigNumber.from(1),
        location: 'https://validator2.umb.network',
      },
      'https://validator.umb.network': {
        id: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: BigNumber.from(1),
        location: 'https://validator.umb.network',
      },
      'https://umb-api.staking.rocks': {
        id: '0x2f85824b2b38f179e451988670935d315b5b9692',
        power: BigNumber.from(1),
        location: 'https://umb-api.staking.rocks',
      },
    };

    const validators: CachedValidator[] = [
      {
        location: 'https://validator.umb.network',
        address: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        location: 'https://validator.umb.network',
        address: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: '1',
        chainId: 'b',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        location: 'https://validator2.umb.network',
        address: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        address: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        location: 'https://umbrella.artemahr.tech',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        address: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        location: 'https://umbrella.artemahr.tech',
        power: '1',
        chainId: 'b',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
    ];

    const expectedValidators: Validator[] = [
      {
        id: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: BigNumber.from(1),
        location: 'https://validator.umb.network',
      },
    ];

    expect(await vs.apply(evmValidators, validators)).to.eql(expectedValidators);
  });

  it('select common validators case4 - with chains', async () => {
    const evmValidators: Record<string, Validator> = {
      'https://validator2.umb.network': {
        id: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: BigNumber.from(1),
        location: 'https://validator2.umb.network',
      },
      'https://validator.umb.network': {
        id: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: BigNumber.from(1),
        location: 'https://validator.umb.network',
      },
      'https://umb-api.staking.rocks': {
        id: '0x2f85824b2b38f179e451988670935d315b5b9692',
        power: BigNumber.from(1),
        location: 'https://umb-api.staking.rocks',
      },
      'https://umbrella.artemahr.tech': {
        id: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        power: BigNumber.from(1),
        location: 'https://umbrella.artemahr.tech',
      },
    };

    const validators: CachedValidator[] = [
      {
        location: 'https://validator.umb.network',
        address: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        location: 'https://validator.umb.network',
        address: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: '1',
        chainId: 'b',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        location: 'https://validator2.umb.network',
        address: '0xe2422b23e52bc13eba04d7fbb9f332deb43360fb',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        address: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        location: 'https://umbrella.artemahr.tech',
        power: '1',
        chainId: 'a',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
      {
        address: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        location: 'https://umbrella.artemahr.tech',
        power: '1',
        chainId: 'b',
        updatedAt: new Date(),
        contractIndex: 0,
        _id: '',
      },
    ];

    const expectedValidators: Validator[] = [
      {
        id: '0x57f404ad75e371c1a539589c1efca12e0c6980ad',
        power: BigNumber.from(1),
        location: 'https://umbrella.artemahr.tech',
      },
      {
        id: '0x977ba523420110e230643b772fe9cf955e11da7b',
        power: BigNumber.from(1),
        location: 'https://validator.umb.network',
      },
    ];

    expect(await vs.apply(evmValidators, validators)).to.eql(expectedValidators);
  });
});
