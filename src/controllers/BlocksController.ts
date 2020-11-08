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
    const offset: number = parseInt(request.params.offset);
    const limit: number = parseInt(request.params.limit);

    const blocks = await getModelForClass(Block)
      .find()
      .skip(offset)
      .limit(limit)
      .sort({ timestamp: -1 })
      .exec();

    response.send({ data: blocks });
  }

  read = async (request: Request, response: Response): Promise<void> => {
    const height = request.params.height;
    const block = await getModelForClass(Block).find({ height }).exec();
    response.send({ data: block });
  }
}

export default BlocksController;
