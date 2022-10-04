import {Factory} from 'rosie';
import {TransactionResponse} from '@ethersproject/providers';
import {BigNumber} from 'ethers';

export const transactionResponseFactory = Factory.define<TransactionResponse>('TransactionResponse')
  .attr('nonce', 1)
  .attr('gasLimit', BigNumber.from(10))
  .attr('gasPrice', BigNumber.from(1))
  .attr('data', '2020-12-22')
  .attr('value', BigNumber.from(10))
  .attr('chainId', 1)
  .attr('hash', '0x1234')
  .attr('blockNumber', 1)
  .attr('timestamp', 1)
  .attr('confirmations', 1)
  .attr('from', '123')
  .attr('raw', 'rawtest');
