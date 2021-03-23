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
      .get('/:height', this.readBlock)
      .get('/height/:height', this.readBlock);
  }

  blockNum = async (request: Request, response: Response): Promise<void> => {
    const block = await getModelForClass(Block).findOne().sort({$natural: -1})

    response.send({data: block});
  }

  readBlock = async (request: Request, response: Response): Promise<void> => {
    const height = parseInt(request.params.height);

    const block = await getModelForClass(Block).findOne({height}).exec();

    response.send({data: block});
  }
}

export default BlocksController;
