import {Factory} from 'rosie';
import {TransactionReceipt} from '@ethersproject/providers';
import {BigNumber} from 'ethers';

export const transactionReceiptFactory = Factory.define<TransactionReceipt>('TransactionRecepeit')
  .attr('to', '0x1234')
  .attr('from', '0x123')
  .attr('contractAddress', '0x123')
  .attr('transactionIndex', 1)
  .attr('root', '0x123')
  .attr('gasUsed', BigNumber.from(1))
  .attr('logsBloom', 'test')
  .attr('blockHash', '0x12345')
  .attr('transactionHash', '0x1234')
  .attr('logs', [
    {
      blockNumber: 1,
      blockHash: '0x123',
      transactionIndex: 1,
      removed: false,
      address: '0x123',
      data: '',
      topics: ['0x5f11830295067c4bcc7d02d4e3b048cd7427be50a3aeb6afc9d3d559ee64bcfa'],
      transactionHash: '0x123',
      logIndex: 1,
    },
  ])
  .attr('blockNumber', 123)
  .attr('confirmations', 123)
  .attr('cumulativeGasUsed', BigNumber.from(1))
  .attr('effectiveGasPrice', BigNumber.from(1))
  .attr('byzantium', false)
  .attr('status', 1)
  .attr('type', 1);
