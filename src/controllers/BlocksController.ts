import {injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {getModelForClass} from '@typegoose/typegoose';

import Block from '../models/Block';

@injectable()
class BlocksController {
  router: express.Router;

  constructor() {
    this.router = express
      .Router()
      .get('/latest', this.blockNum)
      .get('/:blockId', this.readBlock)
      .get('/blockId/:blockId', this.readBlock);
  }

  blockNum = async (request: Request, response: Response): Promise<void> => {
    const block = await getModelForClass(Block).findOne().sort({blockId: -1});

    response.send({data: block});
  };

  readBlock = async (request: Request, response: Response): Promise<void> => {
    const blockId = parseInt(request.params.blockId);

    const block = await getModelForClass(Block).findOne({blockId: blockId}).exec();

    response.send({data: block});
  };
}

export default BlocksController;
