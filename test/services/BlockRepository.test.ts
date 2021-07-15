/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {expect} from 'chai';
import mongoose from 'mongoose';

import {loadTestEnv} from '../helpers/loadTestEnv';
import BlockRepository from '../../src/services/BlockRepository';
import Block from '../../src/models/Block';
import Leaf from '../../src/types/Leaf';
import {getModelForClass} from '@typegoose/typegoose';
import {BigNumber} from 'ethers';
import {SignedBlockConsensus} from '../../src/types/Consensus';

describe('BlockRepository', () => {
  let blockRepository: BlockRepository;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    await getModelForClass(Block).deleteMany({});
    blockRepository = new BlockRepository();
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await mongoose.connection.close();
  });

  it("builds tree data and saves in block's object", async () => {
    const leaves: Leaf[] = [
      {label: 'ETH-USD', valueBytes: '0x01'},
      {label: 'USD-ETH', valueBytes: '0x02'},
    ];

    const result = await blockRepository.apply({
      id: 'block::1',
      chainAddress: '0x333',
      blockId: 1,
      leaves,
      fcdKeys: ['ETH-USD', 'USD-ETH'],
      root: '0x00',
      timestamp: new Date(1000),
      dataTimestamp: new Date(1000),
      minted: true,
    });

    expect(result.data).to.be.an('object').that.deep.eq({
      'ETH-USD': '0x01',
      'USD-ETH': '0x02',
    });
  });

  it('saves the block to database', async () => {
    await blockRepository.apply({
      id: 'block::1',
      chainAddress: '0x333',
      blockId: 1,
      leaves: [],
      fcdKeys: ['ETH-USD', 'USD-ETH'],
      root: '0x00',
      dataTimestamp: new Date(1000),
      timestamp: new Date(1000),
      minted: false,
    });

    const blockFromDb = await getModelForClass(Block).findOne();
    expect(blockFromDb).to.be.an('object');
    expect(blockFromDb?.blockId).to.be.eq(1);
    expect(blockFromDb?.fcdKeys).to.be.deep.eq(['ETH-USD', 'USD-ETH']);
    // is undefined or an empty object
    expect(blockFromDb?.data).to.satisfies((data: any) => data === undefined || Object.keys(data).length === 0);
    expect(blockFromDb?.root).to.be.eq('0x00');
    expect(blockFromDb?.timestamp).to.be.a('Date');
  });

  it('throw when try to overide minted block', async () => {
    const params = {
      id: 'block::1',
      chainAddress: '0x333',
      blockId: 1,
      leaves: [],
      fcdKeys: ['ETH-USD', 'USD-ETH'],
      root: '0x00',
      dataTimestamp: new Date(1000),
      timestamp: new Date(1000),
      minted: true,
    };

    await blockRepository.apply(params);

    await expect(blockRepository.apply(params)).to.throw;
  });

  describe('#saveBlock', () => {
    it('saves a block with its leaves', async () => {
      const blockConsensus: SignedBlockConsensus = {
        dataTimestamp: 1,
        leaves: [],
        root: '0x00',
        fcdKeys: ['ETH-USD', 'USD-ETH'],
      };

      await blockRepository.saveBlock('0x333', blockConsensus, BigNumber.from(1));

      const blocksCount = await getModelForClass(Block).countDocuments({}).exec();
      expect(blocksCount).to.be.eq(1);
    });
  });
});
