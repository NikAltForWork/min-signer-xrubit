const KeyService = require("./keys.js");

class CryptoServiceFactory
{
    async createCryptoService(network, currency, type) {
        const key = new KeyService();
        const serviceKey = `${network}:${currency}`.toLowerCase();

        switch(serviceKey) {
            case 'trc20:usdttrc20': {
                const mnemonic = await key.decryptKey(network, currency, type);
                const USDTService = require("./Tron/USDTService.js");
                return new USDTService(mnemonic);
            }
            case 'trc20:tron': {
                const mnemonic = await key.decryptKey(network, currency, type);
                const TronService = require("./Tron/TronService.js");
                return new TronService(mnemonic);
            }
            case 'ether:etherium': {
                const mnemonic = await key.decryptKey(network, currency, type);
                const EtheriumService = require("./Ether/EtheriumService.js");
                return new EtheriumService(mnemonic);
            }
            default:
            throw new Error(`Unsupported network/currency: ${network}/${currency}`);
        }
    }

}

module.exports = CryptoServiceFactory;
