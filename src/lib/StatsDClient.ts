/* eslint-disable */
const SDC = require('node-statsd-client').Client;

export const StatsDClient = process.env.STATSD_URL ? new SDC(process.env.STATSD_URL, 8125) : null;
