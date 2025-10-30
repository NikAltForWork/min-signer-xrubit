const TronWeb = require('tronweb');
const TronBasicService = require('./TronBasicService');

class TronService extends TronBasicService
{
    constructor(mnemonic) {
        super(mnemonic);
    }

    async createAndSignTransfer(params) {
    try {
      const { to, amount, accountIndex = 0 } = params;

      console.log('Creating transfer to:', to, 'amount:', amount);

      // if (!this.validateAddress(to)) {
      //   throw new Error(`Invalid recipient address: ${to}`);
      // }

      const account = await this.getAccount(accountIndex);
      console.log('Using account:', account.address);

      const signedTronWeb = new TronWeb({
        fullHost: 'https://api.shasta.trongrid.io',
        privateKey: account.privateKey
      });

      const amountInSun = signedTronWeb.toSun(amount);

      const tx = await signedTronWeb.transactionBuilder.sendTrx(to, amountInSun);
      const signedTx = await signedTronWeb.trx.sign(tx);
      const result = await signedTronWeb.trx.sendRawTransaction(signedTx);

      return result

    } catch (error) {
      console.error('Transaction error details:', error);
     // throw new Error(`Failed to create and sign transaction: ${error.message}`); закоментированно пока я не пойму куда делся TrId
    }
  }

}

module.exports = TronService;
