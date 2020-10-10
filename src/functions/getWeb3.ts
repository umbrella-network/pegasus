import Web3 from 'web3';
import settings from '../config/settings';

const getAccount = (web3: Web3): string => {
return settings.blockchain.provider.account ||
    web3.eth.accounts.privateKeyToAccount(settings.blockchain.provider.privateKey).address;
}

const getWeb3 = (): Web3 => {
  const web3 = new Web3(settings.blockchain.provider.url);
  web3.eth.defaultAccount = getAccount(web3);
  return web3;
}

export default getWeb3;
