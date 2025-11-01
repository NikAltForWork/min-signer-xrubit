const TronBasicService = require('../../Core/TronBasicService');
const TronWeb = require('tronweb');
require('dotenv').config();
class USDTService extends TronBasicService
{
    constructor(privateKey) {
        super(privateKey);
        this.address = process.env.USDT_CONTRACT_ADDRESS;
    }

  async createAndSignTransfer(params) {
    try {
      const { to, amount } = params;

      const address = await this.getAccount();

      const signedTronWeb = new TronWeb({
        fullHost: this.network,
        privateKey: this.privateKey
      });

      const contract = await signedTronWeb.contract().at(this.address);
      const amountInSun = signedTronWeb.toSun(amount);

      const transaction = await contract.transfer(
        to,
        amountInSun
      ).send({
        from: address,
        feeLimit: 100000000,
        shouldPollResponse: false
      });

      return {
        txid: transaction,
        from: address,
        to: to,
        amount: amount,
        rawData: transaction.raw_data,
        signature: transaction.signature || []
      };

    } catch (error) {
      console.error('Transaction error details:', error);
    }
  }


   async finishTransaction(address, balance) {
    try {
        const data = await this.connection.get(`wallet:${address}`);
        if (data.privateKey) {
            const signedTronWeb = new TronWeb({
                fullHost: process.env.TRON_NETWORK,
                privateKey: data.privateKey,
            });
            const contract = await signedTronWeb.contract().at(this.address);
            const amountInSun = signedTronWeb.toSun(balance);
            const transaction = await contract.transfer(
                this.getAccount().tronAddress,
                amountInSun
                ).send({
                from: account.address,
                feeLimit: 100000000,
                shouldPollResponse: false
                });

            return transaction;
        }
    } catch(error) {
        console.log(error.message);
    }
  }

   async getBalance(address) {
   try {
    const response = await fetch(`https://api.shasta.trongrid.io/v1/accounts/${address}`);
    const data_u = await response.json();
    if (data_u.data[0] == undefined) {
        return '0'
    }
    const trc20 = data_u.data[0].trc20;

    for (const item of trc20) {
        const key = Object.keys(item)[0];
        if (key === this.address) {
            return item[key] / 1000000;
        }
    }
     return '0';
   } catch (error) {
     console.error('Error fetching balance from TronGrid:', error);
     return '0';
    }
   }

   async getBalanceTR(address) {
     const response = await fetch(`https://api.shasta.trongrid.io/v1/accounts/${address}/transactions/trc20`)
     const data = await response.json();
     return await this.sumTokenAmount(data, this.address);
   }

    async sumTokenAmount(response, contractAddress) {

      if (!response || !Array.isArray(response.data)) return '0';

      const target = String(contractAddress).toLowerCase();

      let total = 0n;
      let decimals = null;

      for (const tx of response.data) {
        if (!tx || !tx.token_info) continue;
        const tokenAddr = String(tx.token_info.address || '').toLowerCase();

        if (tokenAddr === target) {
          try {
            const val = BigInt(tx.value);
            total += val;
            decimals = Number(tx.token_info.decimals ?? decimals ?? 0);
            } catch (err) {
            continue;
            }
         }
        }
      if (total === 0n) return '0';

      const dec = Number(decimals ?? 0);
      if (dec <= 0) return total.toString();

      const pow = 10n ** BigInt(dec);
      const whole = total / pow;
      const frac = total % pow;

      let fracStr = frac.toString().padStart(dec, '0');

      fracStr = fracStr.replace(/0+$/, '');

      return fracStr.length > 0 ? `${whole.toString()}.${fracStr}` : whole.toString();
    }
}
module.exports = USDTService;
