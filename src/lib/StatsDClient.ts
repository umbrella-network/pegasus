/* eslint-disable */
const SDC = require('statsd-client');
const {NEW_RELIC_LABELS} = process.env;

let tags: {[key: string]: string} = {};
tags =
  NEW_RELIC_LABELS?.split(';').reduce((nrTags, tag) => {
    const t = tag.split(':');
    const [key, value] = tag.split(':');
    nrTags[key] = value;
    return nrTags;
  }, tags) ?? tags;

const StatsDClient = process.env.STATSD_URL
  ? new SDC({
      host: process.env.STATSD_URL,
      tags: tags,
    })
  : null;

export default StatsDClient;
