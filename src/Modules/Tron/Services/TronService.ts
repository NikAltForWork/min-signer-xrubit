import TronWeb from "tronweb";
import TronBasicService from "../../../Core/TronBasicService";
import config from "../../../Core/config/config";
import { logger } from "../../../Core/logger";
import ResourcesQueue from "../Polling/Queues/ResourcesQueue";
import BalanceQueue from "../Polling/Queues/BalanceQueue";
import ActicationQueue from "../Polling/Queues/ActivationQueue";

interface TronSignParams {
	network: string;
	currency: string;
	type: string;
	id: string;
	to: string;
	amount: string;
	callback: string;
}

interface FinishControlledTransactionParams {
	address: string;
	balance: string;
	id: string;
}

interface FinishTransactionParams {
	network: string;
	currency: string;
	type: string;
	address: string;
	balance: string;
	id: string;
	callback: string;
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

	/**
	 * Первый этап транзакции в TRX
	 * Запрос и ожидание bandwidth
	 */
	async createAndSignTransfer(params: TronSignParams) {
		logger.debug(`Processing TRX transaction ${params.id} first stage`);
		const addressFrom = await this.getAccount();

		logger.info(` to is ${params.to} from is ${addressFrom}`);
		/**
		 * В расчетах bandwidth нет смысла, потому что сумма всегда ниже 1000
		 * а Re:Fee не позволяет запросить меньше 1000 за один раз
		 */
		await this.reFee.rentResource(addressFrom, 1000, "bandwidth", "1h");

		/**
		 * Ждем поступления bandwidth
		 * Целевая энэргия равнна 0 так
		 * как во время транзакции она не
		 * используется.
		 *
		 * isCryptoToFiat: true для
		 * соблюдения контракта
		 */
		this.resource_queue.addJob(
			{
				id: params.id,
				network: params.network,
				currency: params.currency,
				type: params.type,
				wallet: addressFrom,
				to: params.to,
				balance: params.amount,
				attempts: 1,
				isCryptoToFiat: true,
				targetEnergy: 0,
				targetBandwidth: 600,
				callback: params.callback,
			},
			`${params.id}-TRX`,
			Number.parseInt(config.polling.interval, 10),
		);
	}

	public async finishControlledTransaction(
		params: FinishControlledTransactionParams,
	) {
		logger.info(`Processing TRX transaction ${params.id} second stage`);
		const id = params.id;
		const to = params.address;

		const from = await this.getAccount();
		const amount = params.balance;
		logger.info(` to is ${to} from is ${from}, balance is ${amount}`);
		try {
			const signedTronWeb = new TronWeb({
				fullHost: config.tron.network,
				privateKey: this.privateKey,
				headers: { "TRON-PRO-API-KEY": config.tron.key },
			});

			const amountInSun = signedTronWeb.toSun(amount);
			const pkAddr = signedTronWeb.address.fromPrivateKey(this.privateKey);
			const balSun = await signedTronWeb.trx.getBalance(from);

			logger.info(
				{
					from,
					pkAddr,
					pkMatches: pkAddr === from,
					balSun,
					balTrx: signedTronWeb.fromSun(balSun),
					amountInSun,
					to,
					fullHost: config.tron.network,
				},
				"Preflight",
			);
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
			logger.error(
				{
					msg: error?.message,
					stack: error?.stack,
					name: error?.name,
					code: error?.code,
					response: error?.response?.data ?? error?.response,
					error,
				},
				`Transaction ${id} failed`,
			);
			throw error;
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
			logger.error(
				{
					msg: error?.message,
					stack: error?.stack,
					name: error?.name,
					code: error?.code,
					response: error?.response?.data ?? error?.response,
					error,
				},
				`Transaction ${params.id} failed`,
			);
		}
	}

	public async finishActivationControl() {}

	public async finishFiatToCryptoTransaction() {}

	async getBalance(address: string) {
		try {
			return await this.tronWeb.trx.getBalance(address);
		} catch (error: any) {
			logger.error(
				{
					msg: error?.message,
					stack: error?.stack,
					name: error?.name,
					code: error?.code,
					response: error?.response?.data ?? error?.response,
					error,
				},
				`Failed to get balance for ${address}`,
			);
			return 0;
		}
	}

	async getBalanceTR(address: string) {
		//console.log(address);
	}

	public getContract() {
		return "";
	}

	public isTRX() {
		return true;
	}

	public isUSDT() {
		return false;
	}
}
