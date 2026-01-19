import KeyService from "./keys";
import USDTService from "../Services/Tron/USDTService";
import TronService from "../Services/Tron/TronService";
import BalanceQueue from "./Polling/Queues/BalanceQueue";
import ResourcesQueue from "./Polling/Queues/ResourcesQueue";

export default class CryptoServiceFactory {
	protected balance_queue: BalanceQueue;
	protected resource_queue: ResourcesQueue;

	constructor(balance_queue: BalanceQueue, resource_queue: ResourcesQueue) {
		this.balance_queue = balance_queue;
		this.resource_queue = resource_queue;
	}

	async createCryptoService(network: string, currency: string, type: string) {
		const key = new KeyService();
		const serviceKey = `${network}:${currency}`;

		switch (serviceKey) {
			case "TRC20:USDTTRC20": {
				const privateKey = await key.decryptKey(network, currency, type);
				return new USDTService(
					privateKey,
					this.resource_queue,
					this.balance_queue,
				);
			}
			case "TRC20:TRX": {
				const privateKey = await key.decryptKey(network, currency, type);
				return new TronService(
					privateKey,
					this.resource_queue,
					this.balance_queue,
				);
			}
			default:
				throw new Error(`Unsupported network/currency: ${network}/${currency}`);
		}
	}
}
