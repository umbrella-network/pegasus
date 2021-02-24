import { injectable } from 'inversify';
import express, { Request, Response } from 'express';

@injectable()
class HeathController {
  router: express.Router;

  constructor() {
    this.router = express.Router().get('/', this.pong);
  }

  pong = async (request: Request, response: Response): Promise<void> => {
    response.send('pong');
  }
}

export default HeathController;
