import KeyService from "./keys";
import USDTService from "../Services/Tron/USDTService";
import TronService from "../Services/Tron/TronService";

export default class CryptoServiceFactory {
  async createCryptoService(network: string, currency: string, type: string) {
    const key = new KeyService();
    const serviceKey = `${network}:${currency}`.toLowerCase();

    switch (serviceKey) {
      case "trc20:usdttrc20": {
        const privateKey = await key.decryptKey(network, currency, type);
        return new USDTService(privateKey);
      }
      case "trc20:tron": {
        const privateKey = await key.decryptKey(network, currency, type);
        return new TronService(privateKey);
      }
      default:
        throw new Error(`Unsupported network/currency: ${network}/${currency}`);
    }
  }
}

