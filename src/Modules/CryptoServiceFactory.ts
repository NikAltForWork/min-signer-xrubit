import KeyService from "./Keys/KeyService";
import USDTService from "./Tron/Services/USDTService";
import TronService from "./Tron/Services/TronService";
import BalanceQueue from "./Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "./Tron/Polling/Queues/ResourcesQueue";
import ActivationQueue from "./Tron/Polling/Queues/ActivationQueue";

export default class CryptoServiceFactory {
	protected balance_queue: BalanceQueue;
	protected resource_queue: ResourcesQueue;
	protected activation_queue: ActivationQueue;

	constructor(
		balance_queue: BalanceQueue,
		resource_queue: ResourcesQueue,
		activation_queue: ActivationQueue,
	) {
		this.balance_queue = balance_queue;
		this.resource_queue = resource_queue;
		this.activation_queue = activation_queue;
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
					this.activation_queue,
				);
			}
			case "TRC20:TRX": {
				const privateKey = await key.decryptKey(network, currency, type);
				return new TronService(
					privateKey,
					this.resource_queue,
					this.balance_queue,
					this.activation_queue,
				);
			}
			default:
				throw new Error(`Unsupported network/currency: ${network}/${currency}`);
		}
	}
}
