const path = require('path');

const ms = require('ms');
const dayjs = require('dayjs');
const Graceful = require('@ladjs/graceful');
const Cabin = require('cabin');

const Bree = require('bree');

const bree = new Bree({
  logger: new Cabin(),
  root: path.resolve('app/jobs'),

  jobs: [
    {
      name: 'block-creator-job',
      interval: '1m'
    }
  ]
});

const graceful = new Graceful({ brees: [bree] });
graceful.listen();

bree.start();
