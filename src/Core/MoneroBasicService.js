const MoneroWalletFull = require('monero-javascript');
const { process } = require('monero-javascript/src/main/js/daemon/MoneroDaemonRpc');
require('dotenv').config();

class MoneroBasicService
{
    constructor(mnemonic){
        this.network = process.env.MONERO_NETWORK;
    }

    async createAndSignTransfer(params){}

    async getAccount(){}

    async getBalance(){}
}
