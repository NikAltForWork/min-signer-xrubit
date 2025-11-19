const Ethers = require('ethers');
require('dotenv').config();
class EthersBasicService
{
    constructor(mnemonic) {
        this.network = process.env.ETHERIUM_NETWORK;
        this.provider = new Ethers.JsonRpcProvider(process.env.ETHERIUM_NETWORK);
        this.wallet = Ethers.Wallet.fromPhrase(mnemonic);
    }

    async createAndSignTransfer(params){}

    async createRandomWallet()
    {
      const wallet = Ethers.Wallet.createRandom();

      const data = {
        'Mnemonic': wallet.mnemonic.phrase,
        'Address': wallet.address,
        'private_key': wallet.privateKey,
        }
        return data;
    }

    async getAccount()
    {
        return {
            address: this.wallet.address,
        };
    }

    async getBalance()
    {
        const balanceWei = await this.provider.getBalance(this.wallet.address);
        return Ethers.formatEther(balanceWei);
    }

    async getBalanceTR()
    {
        //todo
    }
}

module.exports = EthersBasicService;
