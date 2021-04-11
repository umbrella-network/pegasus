/* eslint-disable */
const SDC = require('statsd-client');
const StatsDClient = process.env.STATSD_URL ? new SDC({ host: process.env.STATSD_URL, tags: { validator: process.env.HOSTNAME }}) : null;

export default StatsDClient;
