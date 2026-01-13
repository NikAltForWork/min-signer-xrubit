import TronWeb from "tronweb";
import TronBasicService from "../../Core/TronBasicService";
import TronLogNotificationService from "./TronLogNotificationService";
import config from "../../Core/config/config";

interface tronSignParams {
	id: string;
	to: string;
	amount: number;
}

export default class TronService extends TronBasicService {
	constructor(privateKey: string) {
		super(privateKey);
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

			return result;
		} catch (error: any) {
			const logService = new TronLogNotificationService();
			logService.notifyError(error.message, id);
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
			const logService = new TronLogNotificationService();
			logService.notifyError(error.message, id);
			console.log(error.message);
		}
	}

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

	async getLastTransaction(address: string) {
		console.log(address);
	}
}
