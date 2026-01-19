import TronWeb from "tronweb";
import TronBasicService from "../../Core/TronBasicService";
import config from "../../Core/config/config";
import NotificationService from "../Notification/NotificationService";
import ResourcesQueue from "../Polling/Queues/ResourcesQueue";
import BalanceQueue from "../Polling/Queues/BalanceQueue";

interface tronSignParams {
	id: string;
	to: string;
	amount: number;
}
/**
 * Сервис для рвботы с TRX;
 * Также используется для активации кошельков
 */
export default class TronService extends TronBasicService {
	private notifier: NotificationService;

	constructor(
		privateKey: string,
		resource_queue: ResourcesQueue,
		balance_queue: BalanceQueue,
	) {
		super(privateKey, balance_queue, resource_queue);
		this.notifier = new NotificationService();
	}

	async createAndSignTransfer(params: tronSignParams) {
		const { to, amount, id } = params;

		try {
			const signedTronWeb = new TronWeb({
				fullHost: config.tron.network,
				privateKey: this.privateKey,
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

			console.log(result);
			return result;
		} catch (error: any) {
			this.notifier.notifyLog({
				type: "tron",
				level: "info",
				message: error.message,
				id: id,
			});
			console.error("Transaction error details:", error);
		}
	}

	async finishTransaction(address: string, balance: string, id: string) {
		try {
			const data: any = await this.connection.get(`wallet:${address}`);
			if (data.privateKey) {
				const signedTronWeb = new TronWeb({
					fullHost: config.tron.network,
					privateKey: data.privateKey,
				});
				const amountInSun = signedTronWeb.toSun(balance);
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
			this.notifier.notifyLog({
				type: "tron",
				level: "error",
				message: error.message,
				id: id,
			});
			console.log(error.message);
		}
	}

	public async finishControlledTransaction(
		address: string,
		balance: string,
		id: string,
	) {}

	async getBalance(address: string) {
		try {
			return await this.tronWeb.trx.getBalance(address);
		} catch (error: any) {
			console.log(`Failed to get balance: ${error.message}`);
			return 0;
		}
	}

	async getBalanceTR(address: string) {
		console.log(address);
	}

	async activateWallet(wallet: string, id: string) {
		try {
			const signedTronWeb = new TronWeb({
				fullHost: config.tron.network,
				privateKey: this.privateKey,
			});
			const activationFee = Number.parseInt(config.tron.activation_deposit);
			const amountInSun = signedTronWeb.toSun(activationFee);
			const from = await this.getAccount();
			const tx = await signedTronWeb.transactionBuilder.sendTrx(
				wallet,
				amountInSun,
				from,
			);
			const signedTx = await signedTronWeb.trx.sign(tx);
			const result = await signedTronWeb.trx.sendRawTransaction(signedTx);

			return result;
		} catch (error: any) {
			this.notifier.notifyLog({
				type: "tron",
				level: "error",
				message: error.message,
				id: id,
			});
			console.error("Transaction error details:", error);
		}
	}
}
