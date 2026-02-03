import ActivationQueue from "./Tron/Polling/Queues/ActivationQueue";
import BalanceQueue from "./Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "./Tron/Polling/Queues/ResourcesQueue";
import TronTransactionService from "./Tron/Services/TronTransactionService";

export default class TransactionServiceFactory {
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
	public async createTransactionService(network: string) {
		switch (network) {
			case "TRC20": {
				return new TronTransactionService(
					this.resource_queue,
					this.balance_queue,
					this.activation_queue,
				);
			}

			default:
				throw new Error(`Unsupported network: ${network}`);
		}
	}
}
