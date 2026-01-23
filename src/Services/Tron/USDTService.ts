import TronWeb from "tronweb";
import config from "../../Core/config/config";
import TronBasicService from "../../Core/TronBasicService";
import NotificationService from "../Notification/NotificationService";
import ResourcesQueue from "../Polling/Queues/ResourcesQueue";
import BalanceQueue from "../Polling/Queues/BalanceQueue";

interface usdtSignParams {
	id: string;
	to: string;
	amount: number;
}
/**
 * Сервис для работы с USDT в сети TRON
 */
export default class USDTService extends TronBasicService {
	public address: string;
	private notifier: NotificationService;
	constructor(
		privateKey: string,
		resource_queue: ResourcesQueue,
		balance_queue: BalanceQueue,
	) {
		super(privateKey, balance_queue, resource_queue);
		this.address = config.tron.usdt_contract;
		this.notifier = new NotificationService();
	}

	public async createAndSignTransfer(params: usdtSignParams) {
		const { to, amount, id } = params;

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

		await this.tronWeb.trx.sendRawTransaction(signedTx);

		return {
			txid: tx.txid,
			to: to,
			amount: amount,
			rawData: tx.transaction.raw_data,
			signature: tx.transaction.signature || [],
		};
	}

	public async finishTransaction(
		network: string,
		currency: string,
		type: string,
		address: string,
		balance: string,
		id: string,
	) {
		try {
			console.log(`Finishing transaction - ${address} balance is ${balance}`);
			await this.createResourceControlledTransaction(
				network,
				currency,
				type,
				address,
				balance,
				id,
			);
		} catch (error: any) {
			console.log(error.message);
			this.notifier.notifyLog({
				type: "tron",
				level: "error",
				message: `Failed to finish transaction ${error.message}`,
				id: id,
			});
		}
	}

	public async finishControlledTransaction(
		address: string,
		balance: string,
		id: string,
	) {
		try {
			console.log(`Finishing controlled transaction - ${address} balance is ${balance}`);

			const data = await this.connection.get(`wallet:${address}`);

			if (!data) {
				console.error(`transaction - ${address} error key not found`);
				this.notifier.notifyLog({
					type: "tron",
					level: "error",
					message: "Key not found",
					id: id,
				});
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

				const amountInSun = signedTronWeb.toSun(balance);

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

				return {
					txid: tx.txid,
					to: address,
					amount: balance,
					rawData: tx.transaction.raw_data,
					signature: tx.transaction.signature || [],
				};
			}
		} catch (error: any) {
			console.log(error.message);
			this.notifier.notifyLog({
				type: "tron",
				level: "error",
				message: `Failed to finish controlled transaction ${error.message}`,
				id: id,
			});
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
		} catch (error) {
			console.error("Error fetching balance from TronGrid:", error);
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
			console.log(error.message);
			return "0";
		}
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

	private async createResourceControlledTransaction(
		network: string,
		currency: string,
		type: string,
		to: string,
		amount: string,
		id: string,
	) {
		try {

			const targetBandwidth = await this.calculateBandwidth(amount, to);
			const targetEnergy = await this.reFee.calculateEnergy(to);

			this.resource_queue.addJob(
				{
					id: id,
					network: network,
					currency: currency,
					type: type,
					wallet: to,
					balance: amount,
					attempts: 1,
					isRequested: 0,
					targetEnergy: targetEnergy,
					targetBandwidth: targetBandwidth,
				},
				Number.parseInt(config.polling.interval, 10),
			);
		} catch (error: any) {
			console.error(`Transaction failed - ${error.message}`);
			this.notifier.notifyLog({
				type: "tron",
				level: "error",
				message: `Resource controlled transaction failed ${error.message}`,
				id: id,
			});
		}
	}

	private async calculateBandwidth(amount: string, to: string): Promise<number> {
		const BASE_BANDWIDTH = 195;

		const functionSelector = "transfer(address,uint256)";

		const amountInSun = this.tronWeb.toSun(amount);

		const parameter = [
			{ type: "address", value: to },
			{ type: "uint256", value: amountInSun },
		];

		const address = await this.getAccount();

		const transaction = await this.tronWeb.transactionBuilder.triggerSmartContract(
			this.address,
			functionSelector,
			{
				feeLimit: config.tron.fee_limit,
			},
			parameter,
			address,
		);

		const transactionSize = transaction.transaction.raw_data_hex.length / 2;

		const bandwith = BASE_BANDWIDTH + transactionSize;

		return Math.ceil(bandwith);
	}

	public getContract() {
		return this.address;
	}
}
