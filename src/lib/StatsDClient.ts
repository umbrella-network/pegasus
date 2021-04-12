/* eslint-disable */
const SDC = require('statsd-client');
const StatsDClient = process.env.STATSD_URL ? new SDC({ host: process.env.STATSD_URL, tags: { validator_hostname: process.env.HOSTNAME, validator_name: process.env.NAME }}) : null;

export default StatsDClient;
