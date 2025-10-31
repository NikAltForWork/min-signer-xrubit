const TronBasicService = require('../../Core/TronBasicService');
require('dotenv').config();
class USDTService extends TronBasicService
{
    constructor(mnemonic) {
        super(mnemonic);
        this.address = process.env.USDT_CONTRACT_ADDRESS;
    }
}
module.exports = USDTService;
