const config = require('../config/config');
const Cabin = require('cabin');
const Contract = require('web3-eth-contract');

const logger = new Cabin();

logger.info('starting block creator job');

let web3 = new Web3(config.web3);
