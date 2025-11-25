
import TronWeb from 'tronweb';
import { getRedis } from './redis.js';
import config from './config/config.js';

export default class TronBasicService {
  constructor(privateKey) {
    this.connection = getRedis();
    this.privateKey = privateKey;
    this.network = config.tron.network;
    this.tronWeb = new TronWeb({
      fullHost: config.tron.network,
      headers: { 'TRON-PRO-API-KEY': config.tron.key }
    });
  }

 async createAccount() {
   const account = await this.tronWeb.createAccount();
    return account;
 }
  async finishTransactions(address, balance) {}

  async createAndSignTransfer(params) {}

 async getAccount() {
    return this.tronWeb.address.fromPrivateKey(this.privateKey);
  }

  async getBalance(address) {}

  validateAddress(address) {
    return this.tronWeb.isAddress(address);
  }

  toHexAddress(address) {
    return this.tronWeb.address.toHex(address);
  }

  fromHexAddress(hexAddress) {
    return this.tronWeb.address.fromHex(hexAddress);
  }
}

