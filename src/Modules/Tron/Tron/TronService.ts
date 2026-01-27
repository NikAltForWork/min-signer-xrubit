import TronWeb from "tronweb";
import TronBasicService from "../../../Core/TronBasicService";
import config from "../../../Core/config/config";
import { logger } from "../../../Core/logger";
import ResourcesQueue from "../Polling/Queues/ResourcesQueue";
import BalanceQueue from "../Polling/Queues/BalanceQueue";
import ActicationQueue from "../Polling/Queues/ActivationQueue";

interface TronSignParams {
	id: string;
	to: string;
	amount: string;
}

interface FinishControlledTransactionParams {
	address: string,
	balance: string,
	id: string,
}

interface FinishTransactionParams {
	network: string,
	currency: string,
	type: string,
	address: string,
	balance: string,
	id: string,
    callback: string,
}

/**
 * Сервис для рвботы с TRX;
 * Также используется для активации кошельков
 */
export default class TronService extends TronBasicService {
	constructor(
		privateKey: string,
		resource_queue: ResourcesQueue,
		balance_queue: BalanceQueue,
		activation_queue: ActicationQueue,
	) {
		super(privateKey, balance_queue, resource_queue, activation_queue);
	}

	async createAndSignTransfer(params: TronSignParams) {
		const { to, amount, id } = params;

		try {
			const signedTronWeb = new TronWeb({
				fullHost: config.tron.network,
				privateKey: this.privateKey,
				headers: { "TRON-PRO-API-KEY": config.tron.key },
			});

			const amountInSun = signedTronWeb.toSun(amount);
			const from = await this.getAccount();
			const tx = await signedTronWeb.transactionBuilder.sendTrx(
				to,
				amountInSun,
				from,
			);
			const signedTx = await signedTronWeb.trx.sign(tx);
			const result = await signedTronWeb.trx.sendRawTransaction(signedTx);

			return result;
		} catch (error: any) {
			logger.info(
				{
					error: error.message,
				},
				`Transaction ${id} failed`,
			);
		}
	}

	async finishTransaction(params: FinishTransactionParams) {
		try {
			const data: any = await this.connection.get(`wallet:${params.address}`);
			if (data.privateKey) {
				const signedTronWeb = new TronWeb({
					fullHost: config.tron.network,
					privateKey: data.privateKey,
					headers: { "TRON-PRO-API-KEY": config.tron.key },
				});
				const amountInSun = signedTronWeb.toSun(params.balance);
				const address = await this.getAccount();
				const tx = await signedTronWeb.transactionBuilder.sendTrx(
					address,
					amountInSun,
				);
				const signedTx = await signedTronWeb.trx.sign(tx);
				const result = await signedTronWeb.trx.sendRawTransaction(signedTx);
				return result;
			}
		} catch (error: any) {
			logger.info(
				{
					error: error.message,
				},
				`Transaction ${params.id} failed`,
			);
		}
	}

	public async finishActivationControl() {}

	public async finishControlledTransaction(params: FinishControlledTransactionParams) {}

	public async finishFiatToCryptoTransaction() {}

	async getBalance(address: string) {
		try {
			return await this.tronWeb.trx.getBalance(address);
		} catch (error: any) {
			logger.error(
				{
					error: error.message,
				},
				`Failed to get balance for ${address}`,
			);
			return 0;
		}
	}

	async getBalanceTR(address: string) {
		console.log(address);
	}

	public getContract() {
		return "";
	}
}
