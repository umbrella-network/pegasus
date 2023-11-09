import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {getModelForClass} from '@typegoose/typegoose';

import Block from '../models/Block.js';
import Settings from '../types/Settings.js';

@injectable()
class BlocksController {
  router: express.Router;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express
      .Router()
      .get('/latest', this.latestBlock)
      .get('/:blockId', this.blocksForId)
      .get('/blockId/:blockId', this.blocksForId);
  }

  private latestBlock = async (request: Request, response: Response): Promise<void> => {
    const block = await getModelForClass(Block).findOne().sort({timestamp: -1});

    response.send({data: block});
  };

  private blocksForId = async (request: Request, response: Response): Promise<void> => {
    const blockId = parseInt(request.params.blockId);

    const blocks = await getModelForClass(Block).find({blockId: blockId}).exec();

    response.send({data: blocks, version: this.settings.version, dataLength: blocks.length});
  };
}

export default BlocksController;
