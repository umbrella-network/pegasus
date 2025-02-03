import {inject, injectable} from 'inversify';
import {ethers} from 'ethers';

import {DeviationSignerRepository} from '../repositories/DeviationSignerRepository.js';
import {ChainsIds} from '../types/ChainsIds.js';

@injectable()
class PriceSignerService {
  @inject(DeviationSignerRepository) protected deviationSignerRepository!: DeviationSignerRepository;

  async sign(message: string): Promise<{signerAddress: string; hashVersion: number; signature: string; hash: string}> {
    const hashVersion = 1;
    const hash = ethers.utils.id(message);
    const signer = this.deviationSignerRepository.get(ChainsIds.ROOTSTOCK);
    const signerAddress = await signer.address();
    const signature = await signer.apply(hash);

    return {signerAddress, hashVersion, signature, hash};
  }
}

export default PriceSignerService;
