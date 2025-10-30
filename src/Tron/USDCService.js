const TronBasicService = require('./TronBasicService.js');
require('dotenv').config();
class USDCService extends TronBasicService
{
    constructor(mnemonic) {
        super(mnemonic);
        this.address = process.env.USDC_CONTRACT_ADDRESS;
    }
}
module.exports = USDCService;
