import YAML from 'yamljs';
import express from 'express';
import { injectable } from 'inversify';
import swaggerUi from 'swagger-ui-express';

const swaggerDocument = YAML.load('./src/docs/api.yaml');

@injectable()
class HeathController {
  router: express.Application;

  constructor() {
    this.router = express()
      .use(swaggerUi.serve)
      .get(
        '/',
        swaggerUi.setup(swaggerDocument, {
          explorer: true,
        })
      );
  }
}

export default HeathController;
