import TronTransactionService from "./Tron/Services/TronTransactionService";

export type TransactionServiceFactoryDependencies = {
	tronTransactionServiceFactory: () => TronTransactionService;
};

export default class TransactionServiceFactory {
	private tronTransactionServiceFactory: () => TronTransactionService;
	constructor({
		tronTransactionServiceFactory,
	}: TransactionServiceFactoryDependencies) {
		this.tronTransactionServiceFactory = tronTransactionServiceFactory;
	}
	public async createTransactionService(network: string) {
		switch (network) {
			case "TRC20": {
				return this.tronTransactionServiceFactory;
			}

			default:
				throw new Error(`Unsupported network: ${network}`);
		}
	}
}
