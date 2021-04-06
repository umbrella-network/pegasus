/* eslint-disable */
const SDC = require('node-statsd-client').Client;
let StatsDClient: any = null;

if(process.env['STATSD_URL']) {
    console.log('Starting stats D in', process.env['STATSD_URL'])
    StatsDClient = new SDC(process.env['STATSD_URL'], 8125);
}

export default StatsDClient;