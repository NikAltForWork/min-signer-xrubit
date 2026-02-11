import KeyService from "./Keys/KeyService";
import USDTService from "./Tron/Services/USDTService";
import TronService from "./Tron/Services/TronService";

type FactoryDependencies = {
	keyService: KeyService;
	usdtServiceFactory: (privateKey: string) => USDTService;
	tronServiceFactory: (privateKey: string) => TronService;
};

export default class CryptoServiceFactory {
	private keyService: KeyService;
	private usdtServiceFactory: (privateKey: string) => USDTService;
	private tronServiceFactory: (privateKey: string) => TronService;

	constructor({
		keyService,
		usdtServiceFactory,
		tronServiceFactory,
	}: FactoryDependencies) {
		this.keyService = keyService;
		this.usdtServiceFactory = usdtServiceFactory;
		this.tronServiceFactory = tronServiceFactory;
	}

	async createCryptoService(network: string, currency: string, type: string) {
		const serviceKey = `${network}:${currency}`;
		const privateKey = await this.keyService.decryptKey(
			network,
			currency,
			type,
		);

		switch (serviceKey) {
			case "TRC20:USDTTRC20":
				return this.usdtServiceFactory(privateKey);

			case "TRC20:TRX":
				return this.tronServiceFactory(privateKey);

			default:
				throw new Error(`Unsupported network/currency: ${network}/${currency}`);
		}
	}
}
