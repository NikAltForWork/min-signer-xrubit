const TronWeb = require('tronweb');
const Redis = require('ioredis');
require('dotenv').config();

class TronBasicService {
  constructor(privateKey) {
    this.connection = new Redis({
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    });
    this.privateKey = privateKey;
    this.network = process.env.TRON_NETWORK;
    this.tronWeb = new TronWeb({
      fullHost: process.env.TRON_NETWORK,
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

module.exports = TronBasicService;
