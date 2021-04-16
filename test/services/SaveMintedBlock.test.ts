/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {expect} from 'chai';
import mongoose from 'mongoose';
import * as uuid from 'uuid';

import {loadTestEnv} from '../helpers/loadTestEnv';
import SaveMintedBlock from '../../src/services/SaveMintedBlock';
import Block from '../../src/models/Block';
import Leaf from '../../src/models/Leaf';
import {getModelForClass} from '@typegoose/typegoose';

describe('SaveMintedBlock', () => {
  let saveMintedBlock: SaveMintedBlock;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(async () => {
    await getModelForClass(Block).deleteMany({});
    await getModelForClass(Leaf).deleteMany({});
    saveMintedBlock = new SaveMintedBlock();
  });

  after(async () => {
    await getModelForClass(Block).deleteMany({});
    await getModelForClass(Leaf).deleteMany({});
    await mongoose.connection.close();
  });

  it("builds tree data and saves in block's object", async () => {
    const leaves: Leaf[] = [
      {_id: uuid.v4(), label: 'ETH-USD', valueBytes: '0x01', timestamp: new Date(), blockHeight: 1},
      {_id: uuid.v4(), label: 'USD-ETH', valueBytes: '0x02', timestamp: new Date(), blockHeight: 1},
    ];

    const result = await saveMintedBlock.apply({
      id: 'block::1',
      blockHeight: 1,
      leaves,
      numericFcdKeys: ['ETH-USD', 'USD-ETH'],
      numericFcdValues: [1337.12, 512.12],
      root: '0x00',
      timestamp: new Date(1000),
      dataTimestamp: new Date(1000),
    });

    expect(result.data).to.be.an('object').that.deep.eq({
      'ETH-USD': '0x01',
      'USD-ETH': '0x02',
    });
  });

  it('generates UUID and saves the block to database', async () => {
    await saveMintedBlock.apply({
      blockHeight: 1,
      leaves: [],
      numericFcdKeys: ['ETH-USD', 'USD-ETH'],
      numericFcdValues: [1337.12, 512.12],
      root: '0x00',
      dataTimestamp: new Date(1000),
      timestamp: new Date(1000),
    });

    const blockFromDb = await getModelForClass(Block).findOne();
    expect(blockFromDb).to.be.an('object');
    expect(uuid.validate(blockFromDb?._id as string)).to.be.true;
    expect(blockFromDb?.height).to.be.eq(1);
    expect(blockFromDb?.numericFcdKeys).to.be.deep.eq(['ETH-USD', 'USD-ETH']);
    expect(blockFromDb?.numericFcdValues).to.be.deep.eq([1337.12, 512.12]);
    // is undefined or an empty object
    expect(blockFromDb?.data).to.satisfies((data: any) => data === undefined || Object.keys(data).length === 0);
    expect(blockFromDb?.root).to.be.eq('0x00');
    expect(blockFromDb?.timestamp).to.be.a('Date');
  });
});
