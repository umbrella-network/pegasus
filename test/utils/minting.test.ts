import {expect} from 'chai';
import {ethers} from 'ethers';
import {signAffidavitWithWallet, sortSignaturesBySigner} from '../../src/utils/mining';

describe('sortSignaturesBySigner', () => {
  const validatorsInOrder = [
    {
      address: '0xe075a3a57a2d12790e4d0547d84C077aee18dBD2',
      pk: '0xf5d32ae5bc0bd637c4077ed6a40bf33d6b78c5985c599994d8b7004e328d2254',
    },
    {
      address: '0xEb69B78f535C18d11a05D5a8467c38174e2fbE01',
      pk: '0xba6091936a54151115add475b52b4563420d159fdb57ca42cd58804f33508585',
    },
  ];

  it('expect validators addresses NOT in order when compare with case sensitiveness', async () => {
    expect(validatorsInOrder[0].address < validatorsInOrder[1].address).false;
  });

  it('expect to sort signatures by signer', async () => {
    const affidavit = ethers.constants.HashZero;

    const signaturesInOrder = await Promise.all(
      validatorsInOrder.map((validator) => {
        const wallet = new ethers.Wallet(validator.pk);
        return signAffidavitWithWallet(wallet, affidavit);
      }),
    );

    const sorted = sortSignaturesBySigner(signaturesInOrder, affidavit);

    expect(sorted).to.eql(signaturesInOrder);
  });
});
