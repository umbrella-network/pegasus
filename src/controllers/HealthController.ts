import { injectable } from 'inversify';
import express, { Request, Response } from 'express';

@injectable()
class HeathController {
  router: express.Application;

  constructor() {
    this.router = express().get('/', this.pong);
  }

  pong = async (request: Request, response: Response): Promise<void> => {
    response.send('pong');
  }
}

export default HeathController;
