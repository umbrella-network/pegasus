import { injectable } from 'inversify';
import express, { Request, Response } from 'express';
import Block from '../models/Block';
import { getModelForClass } from '@typegoose/typegoose';

@injectable()
class BlocksController {
  router: express.Router;

  constructor() {
    this.router = express
      .Router()
      .get('/', this.index)
      .get('/height/:height', this.read);
  }

  index = async (request: Request, response: Response): Promise<void> => {
    const offset: number = parseInt(<string> request.query.offset);
    const limit: number = parseInt(<string> request.query.limit);

    const blocks = await getModelForClass(Block)
      .find()
      .skip(offset)
      .limit(limit)
      .sort({ timestamp: -1 })
      .exec();

    response.send({ data: blocks });
  }

  read = async (request: Request, response: Response): Promise<void> => {
    const height = parseInt(request.params.height);
    const block = await getModelForClass(Block).findOne({ height }).exec();
    response.send({ data: block });
  }
}

export default BlocksController;
