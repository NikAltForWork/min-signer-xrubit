import TronWeb from "tronweb";
import config from "../../../Core/config/config";
import { logger } from "../../../Core/logger/logger";
import TronBasicService, {
	type TronBasicDependencies,
} from "../../../Core/basicServices/TronBasicService";
import NotificationService from "../Notification/NotificationService";
import { NotificationTypes } from "../Notification/Queues/NorificationQueue";

interface UsdtSignParams {
	network: string;
	currency: string;
	type: string;
	id: string;
	to: string;
	amount: string;
	callback: string;
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

interface FinishControlledTransactionParams {
	address: string;
	balance: string;
	id: string;
    callback?: string;
}

interface CreateResourceControlledTransactionParams {
	network: string;
	currency: string;
	type: string;
	to: string;
	amount: string;
	id: string;
	callback: string;
}

interface FinishActivationControlParams {
	network: string;
	currency: string;
	type: string;
	to: string;
	amount: string;
	id: string;
	isCryptoToFiat: boolean;
	callback: string;
}

type UsdtDependencies = TronBasicDependencies & {
	notificationService: NotificationService;
};

/**
 * Сервис для работы с USDT в сети TRON
 * Поддерживает 2 направления - Крипто-Фиат и Фиат-Крипто.
 * Сервер разросся слишком сильно
 * TODO: поделить на use case
 */
export default class USDTService extends TronBasicService {
	public address: string;
	private notifier: NotificationService;
	constructor({ notificationService, ...basicDeps }: UsdtDependencies) {
		super(basicDeps);
		this.address = config.tron.usdt_contract;
		this.notifier = notificationService;
	}

	/**
	 * Первый этап Фиат-Крипто транзакции.
	 * Так как Главный Кошелек уже активирован
	 * сразу запускает запрос ресурсов у Re:Fee
	 */
	public async createAndSignTransfer(params: UsdtSignParams) {
		this.finishActivationControl({
			network: params.network,
			currency: params.currency,
			type: params.type,
			to: params.to,
			amount: String(params.amount),
			id: params.id,
			isCryptoToFiat: false,
			callback: params.callback,
		});
	}

	/**
	 * Последний этап Фиат-Крипто транзакции.
	 * Создает перевод с главного кошелька на
	 * кошелек клиента.
	 */
	public async finishFiatToCryptoTransaction(params: UsdtSignParams) {
		const { to, amount, id, callback } = params;

		const functionSelector = "transfer(address,uint256)";

		const amountInSun = this.tronWeb.toSun(amount);

		const parameter = [
			{ type: "address", value: to },
			{ type: "uint256", value: amountInSun },
		];

		const tx = await this.tronWeb.transactionBuilder.triggerSmartContract(
			this.address,
			functionSelector,
			{
				feeLimit: config.tron.fee_limit,
			},
			parameter,
		);
		const signedTx = await this.tronWeb.trx.sign(tx.transaction);

		const response = await this.tronWeb.trx.sendRawTransaction(signedTx);

        const txid = response?.txid ?? tx?.txid;

		await this.notification_queue.addJob({
            wallet: to,
            internalId: id,
            txId: txid,
            callback: callback,
            type: NotificationTypes.TRANSACTION_FIAT_TO_CRYPTO_COMPLETED
        }, `${id}-NOTIFICATION`)

    }

	/**
	 * метод для обработки вебхука подтверждения с backend
	 */
	public async finishTransaction(params: FinishTransactionParams) {
		try {
			logger.info(`Processing USDT transaction - ${params.id}`);

			await this.createResourceControlledTransaction({
				network: params.network,
				currency: params.currency,
				type: params.type,
				to: params.address,
				amount: params.balance,
				id: params.id,
				callback: params.callback,
			});
		} catch (error: any) {
			logger.error(
				{
					error: error,
				},
				`Transaction ${params.id} failed`,
			);
		}
	}
	/**
	 * Последний этап транзакции с контролем ресурсов.
	 * Этот метод вызывается после проверки на поступление
	 * ресурсов от Re:Fee
	 * Этот метод пересылает валюту с короткоживущего
	 * временного кошелька на постоянный
	 */
	public async finishControlledTransaction(
		params: FinishControlledTransactionParams,
	) {
		try {
			logger.info(`Processing USDT transaction ${params.id} - Last stage`);
			const data = await this.connection.get(`wallet:${params.address}`);

			if (!data) {
				logger.error(
					{
						error: `Key for ${params.id} is not found`,
					},
					`Transaction ${params.id} failed`,
				);
				return;
			}

			const data_fn = await JSON.parse(data);

			if (data_fn.privateKey) {
				const signedTronWeb = new TronWeb({
					fullHost: config.tron.network,
					privateKey: data_fn.privateKey,
					headers: { "TRON-PRO-API-KEY": config.tron.key },
				});

				const to = await this.getAccount();

				const functionSelector = "transfer(address,uint256)";

				const amountInSun = signedTronWeb.toSun(params.balance);

				const parameter = [
					{ type: "address", value: to },
					{ type: "uint256", value: amountInSun },
				];

				const tx = await signedTronWeb.transactionBuilder.triggerSmartContract(
					this.address,
					functionSelector,
					{
						feeLimit: config.tron.fee_limit,
					},
					parameter,
				);
				const signedTx = await signedTronWeb.trx.sign(tx.transaction);

				await signedTronWeb.trx.sendRawTransaction(signedTx);

                if(params.callback != null) {
                    await this.notification_queue.addJob({
                        wallet: params.address,
                        internalId: params.id,
                        callback: params.callback,
                        type: NotificationTypes.TRANSACTION_CRYPTO_TO_FIAT_COMPLETED,
                    }, `${params.id}-NOTIFICATION`);
                }

				return {
					txid: tx.txid,
					to: params.address,
					amount: params.balance,
					rawData: tx.transaction.raw_data,
					signature: tx.transaction.signature || [],
				};
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
	/**
	 * Проврека баланса
	 */
	public async getBalance(address: string) {
		try {
			const response = await fetch(
				`${config.tron.network}/v1/accounts/${address}`,
				{
					headers: {
						"TRON-PRO-API-KEY": config.tron.key,
					},
				},
			);
			const data_u = await response.json();
			if (data_u?.data?.[0] === undefined) {
				return "0";
			}
			const trc20 = data_u.data[0].trc20;

			for (const item of trc20) {
				const key = Object.keys(item)[0];
				if (key === this.address) {
					return item[key] / 1000000;
				}
			}
			return "0";
		} catch (error: any) {
			logger.info(
				{
					error: error.message,
				},
				`Failed to get balance for ${address}`,
			);
			return "0";
		}
	}

	/**
	 * Проверка баланса через транзакции
	 */
	public async getBalanceTR(address: string) {
		try {
			const response = await fetch(
				`${config.tron.network}/v1/accounts/${address}/transactions/trc20`,
				{
					headers: {
						"TRON-PRO-API-KEY": config.tron.key,
					},
				},
			);
			const data = await response.json();
			return await this.sumTokenAmount(data, this.address);
		} catch (error: any) {
			logger.info(
				{
					error: error.message,
				},
				`Failed to get balance for ${address}`,
			);
			return "0";
		}
	}

	public async getTechBalance(address: string) {
		//TODO: add realization
		return "0";
	}

	public async getLastTransaction(address: string) {
		const url = `${config.tron.network}/v1/accounts/${address}/transactions/trc20?contract_address=${this.address}`;
		const res = await fetch(url, {
			headers: {
				"TRON-PRO-API-KEY": config.tron.key,
			},
		});
		const res_data = await res.json();
		if (res_data.data && res_data.data[0].transaction_id) {
			return res_data.data[0].transaction_id;
		}
		return null;
	}

	private async sumTokenAmount(response: any, contractAddress: string) {
		if (!response || !Array.isArray(response.data)) return "0";

		const target = String(contractAddress).toLowerCase();

		let total = 0n;
		let decimals = null;

		for (const tx of response.data) {
			if (!tx || !tx.token_info) continue;
			const tokenAddr = String(tx.token_info.address || "").toLowerCase();

			if (tokenAddr === target) {
				try {
					const val = BigInt(tx.value);
					total += val;
					decimals = Number(tx.token_info.decimals ?? decimals ?? 0);
				} catch (err) {}
			}
		}
		if (total === 0n) return "0";

		const dec = Number(decimals ?? 0);
		if (dec <= 0) return total.toString();

		const pow = 10n ** BigInt(dec);
		const whole = total / pow;
		const frac = total % pow;

		let fracStr = frac.toString().padStart(dec, "0");

		fracStr = fracStr.replace(/0+$/, "");

		return fracStr.length > 0
			? `${whole.toString()}.${fracStr}`
			: whole.toString();
	}
	/**
	 * Первый этап транзакции с контролем ресурсов,
	 * Этот метод запускает проверку активации кошелька
	 */
	private async createResourceControlledTransaction(
		params: CreateResourceControlledTransactionParams,
	) {
		try {
			logger.info(`Processing USDT transaction ${params.id} - First stage`);
			await this.activation_queue.addJob(params, params.id);
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
	/**
	 * Второй этап транзакции с контролем ресурсов.
	 * Этот метод вызывается после успешной проверки активации кошелька.
	 * Этот метод запрашивает ресурсы у Re:Fee и  запускает проверку их поступления.
	 */
	public async finishActivationControl(params: FinishActivationControlParams) {
		try {
			logger.info(`Processing USDT transaction ${params.id} - Second stage`);

			let targetBandwidth = 0;

			const targetEnergy = await this.reFee.calculateEnergy(params.to);

			let wallet;
			if (params.isCryptoToFiat === true) {
				wallet = params.to;
			}

			if (params.isCryptoToFiat === false) {
				wallet = await this.getAccount();
			}

			/**
			 * Для Крипто-Фиат транзкций используем
			 * родной bandwidth
			 */
			if (params.isCryptoToFiat === false) {
				targetBandwidth = await this.calculateBandwidth(
					params.amount,
					params.to,
				);

				await this.reFee.rentResource(
					wallet,
					targetBandwidth,
					"bandwidth",
					"1h",
				);
			}

			await this.reFee.rentResource(wallet, targetEnergy, "energy", "1h");

			await this.resource_queue.addJob(
				{
					id: params.id,
					network: params.network,
					currency: params.currency,
					type: params.type,
					wallet: wallet,
					to: params.to,
					balance: params.amount,
					attempts: 1,
					isCryptoToFiat: params.isCryptoToFiat,
					targetEnergy: targetEnergy,
					targetBandwidth: targetBandwidth,
					callback: params.callback,
				},
				params.id,
				Number.parseInt(config.polling.interval, 10),
			);
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

	private async calculateBandwidth(
		amount: string,
		to: string,
	): Promise<number> {
		const BASE_BANDWIDTH = 195;

		const functionSelector = "transfer(address,uint256)";

		const amountInSun = this.tronWeb.toSun(amount);

		const parameter = [
			{ type: "address", value: to },
			{ type: "uint256", value: amountInSun },
		];

		const address = await this.getAccount();

		const transaction =
			await this.tronWeb.transactionBuilder.triggerSmartContract(
				this.address,
				functionSelector,
				{
					feeLimit: config.tron.fee_limit,
				},
				parameter,
				address,
			);

		const transactionSize = transaction.transaction.raw_data_hex.length / 2;

		let bandwith = BASE_BANDWIDTH + transactionSize;

		if (bandwith < 1000) {
			bandwith = 1000;
		}

		return Math.ceil(bandwith);
	}

	public getContract() {
		return this.address;
	}

	public isTRX() {
		return false;
	}

	public isUSDT() {
		return true;
	}
}
