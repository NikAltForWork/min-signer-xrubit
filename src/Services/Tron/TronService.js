const TronWeb = require('tronweb');
const TronBasicService = require('../../Core/TronBasicService');

class TronService extends TronBasicService
{
    constructor(privateKey) {
        super(privateKey);
    }

    async createAndSignTransfer(params) {
    try {
      const { to, amount, accountIndex = 0 } = params;

      const signedTronWeb = new TronWeb({
        fullHost: 'https://api.shasta.trongrid.io',
        privateKey: this.privateKey
      });

      const amountInSun = signedTronWeb.toSun(amount);
      const from = await this.getAccount();
      const tx = await signedTronWeb.transactionBuilder.sendTrx(to, amountInSun, from);
      const signedTx = await signedTronWeb.trx.sign(tx);
      const result = await signedTronWeb.trx.sendRawTransaction(signedTx);

      return result

    } catch (error) {
      console.error('Transaction error details:', error);
    }
    }

    async finishTransactions(address, balance) {
    try {
        const data = await this.connection.get(`wallet:${address}`);
        if (data.privateKey) {
            const signedTronWeb = new TronWeb({
                fullHost: process.env.TRON_NETWORK,
                privateKey: data.privateKey,
            });
            const amountInSun = signedTronWeb.toSun(balance);
            const address = await this.getAccount();
            const tx = await signedTronWeb.transactionBuilder.sendTrx(address, amountInSun);
            const signedTx = await signedTronWeb.trx.sign(tx);
            const result = await signedTronWeb.trx.sendRawTransaction(signedTx);
            return result;
        }
    } catch(error) {
        console.log(error.message);
    }
  }


    async getBalance(address) {
    try {
       return await this.tronWeb.trx.getBalance(address);
    } catch (error) {
      console.log(`Failed to get balance: ${error.message}`);
      return 0;
    }
  }


}

module.exports = TronService;
