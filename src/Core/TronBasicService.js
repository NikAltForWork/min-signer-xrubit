const TronWeb = require('tronweb');
const bip39 = require('bip39');
const { HDNodeWallet } = require('ethers');
require('dotenv').config();

class TronBasicService {
  constructor(mnemonic) {
    console.log('TronService initialized with mnemonic:', mnemonic ? 'PRESENT' : 'MISSING');
    console.log('Mnemonic length:', mnemonic ? mnemonic.length : 0);

    this.mnemonic = mnemonic;
    this.network = process.env.TRON_NETWORK;
    this.tronWeb = new TronWeb({
      fullHost: process.env.TRON_NETWORK,
    });
  }

 async createAccount() {
   const account = await this.tronWeb.createAccount();
    return account;
 }

 async getAccount(accountIndex = 0) {
    console.log('Getting account with mnemonic:', this.mnemonic ? 'PRESENT' : 'MISSING');

    if (!this.mnemonic) {
      throw new Error('Mnemonic phrase is missing');
    }

    if (!bip39.validateMnemonic(this.mnemonic)) {
      console.log('Mnemonic validation failed for:', this.mnemonic);
      throw new Error('Invalid mnemonic phrase');
    }

    console.log('Mnemonic is valid, generating account...');

    const seed = bip39.mnemonicToSeedSync(this.mnemonic);
    const hdNode = HDNodeWallet.fromSeed(seed);
    const tronPath = `m/44'/195'/${accountIndex}'/0/0`;

    const wallet = hdNode.derivePath(tronPath);
    const privateKey = wallet.privateKey.slice(2);
    const tronAddress = this.tronWeb.address.fromPrivateKey(privateKey);

    console.log('Generated account:', tronAddress);

    return {
      address: tronAddress,
      privateKey: privateKey,
      index: accountIndex
    };
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
        fullHost: this.network,
        privateKey: account.privateKey
      });

      const contract = await signedTronWeb.contract().at(this.address);
      const amountInSun = signedTronWeb.toSun(amount);

      console.log('Calling contract transfer...');

      const transaction = await contract.transfer(
        to,
        amountInSun
      ).send({
        from: account.address,
        feeLimit: 100000000,
        shouldPollResponse: false
      });
      console.log('Transaction created successfully:', transaction.txId);

      return {
        txId: transaction.txId,
        from: account.address,
        to: to,
        amount: amount,
        rawData: transaction.raw_data,
        signature: transaction.signature || []
      };

    } catch (error) {
      console.error('Transaction error details:', error);
     // throw new Error(`Failed to create and sign transaction: ${error.message}`); закоментированно пока я не пойму куда делся TrId
    }
  }

  async getBalance(address) {
    try {
      const trxBalance = await this.tronWeb.trx.getBalance(address);
      const usdtBalance = await this.getUSDTBalance(address);

      return {
        trx: this.tronWeb.fromSun(trxBalance),
        usdt: usdtBalance
      };
    } catch (error) {
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }
/**
  async getUSDTBalance(address) {
    try {
      const contract = await this.tronWeb.contract().at(this.USDT_CONTRACT_ADDRESS);
      const balance = await contract.balanceOf(address).call();
      return this.tronWeb.fromSun(balance);
    } catch (error) {
      console.error(error);
      return '0';
    }
  }
**/

  async getUSDTBalance(address) {
   try {
     const response = await fetch(`https://api.shasta.trongrid.io/v1/accounts/${address}`);
     const data_u = await response.json();
    console.log(data_u.data.trc20);
    const trc20 = data_u.data[0].trc20;

    for (const item of trc20) {
        const key = Object.keys(item)[0];
        if (key === this.USDT_CONTRACT_ADDRESS) {
            return item[key] / 1000000;
        }
    }
     return '0';
   } catch (error) {
     console.error('Error fetching balance from TronGrid:', error);
     return '0';
   }
 }

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
