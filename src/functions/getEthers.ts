import { ethers } from 'ethers';
import { Provider } from '@ethersproject/providers';
import settings from '../config/settings';

const getEthers = (): Provider => {
  const provider = new ethers.providers.WebSocketProvider(settings.blockchain.provider.url);
  return provider;
}

export default getEthers;
