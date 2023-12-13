import chai from 'chai';

import {hashFeedName, hashFeedName0x} from '../../src/utils/hashFeedName.js';

const {expect} = chai;
const hash = '64e604787cbf194841e7b68d7cd28786f6c9a0a3ab9f8b0a0e87cb4387ab0107';

it('hashFeedName', async () => {
  expect(hashFeedName('123')).to.be.eq(hash);
});

it('hashFeedName0x', async () => {
  expect(hashFeedName0x('123')).to.be.eq(`0x${hash}`);
});
