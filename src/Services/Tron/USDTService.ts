import TronWeb from "tronweb";
import config from "../../Core/config/config";
import TronLogNotificationService from "./TronLogNotificationService";
import TronBasicService from "../../Core/TronBasicService";
import TronService from "./TronService";
import ReFeeService from "./ReFeeService";

interface usdtSignParams {
	id: string;
	to: string;
	amount: number;
}

export default class USDTService extends TronBasicService {
	public address: string | undefined;

	constructor(privateKey: string) {
		super(privateKey);
		this.address = config.tron.usdt_contract;
	}

	public async createAndSignTransfer(params: usdtSignParams) {
		const { to, amount, id } = params;
		const tronWeb = new TronWeb({
			fullHost: this.network,
			privateKey: this.privateKey,
		});
		return await this.createResourceControlledTransaction(
			to,
			amount,
			tronWeb,
			id,
		);
	}

	public async finishTransaction(address: string, balance: string, id: string) {
		try {
			console.log(`Finishing transaction - ${address} balance is ${balance}`);

			const service = new TronService(this.privateKey);

			const params = { to: address, amount: 4, id: id };
			await service.createAndSignTransfer(params);

			const data = await this.connection.get(`wallet:${address}`);

			if (!data) {
				console.error(`transaction - ${address} error key not found`);
				const logService = new TronLogNotificationService();
				logService.notifyError("Key not found", id);
				return;
			}

			const data_fn = await JSON.parse(data);

			if (data_fn.privateKey) {
				const signedTronWeb = new TronWeb({
					fullHost: config.tron.network,
					privateKey: data_fn.privateKey,
				});

				return await this.createResourceControlledTransaction(
					await this.getAccount(),
					Number.parseFloat(balance),
					signedTronWeb,
					id,
				);
			}
		} catch (error: any) {
			console.log(error.message);
			const logService = new TronLogNotificationService();
			logService.notifyError(error.message, id);
		}
	}

	public async getBalance(address: string) {
		try {
			const response = await fetch(
				`${config.tron.network}/v1/accounts/${address}`,
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

	public async getBalanceTR(address: string) {
		const response = await fetch(
			`${config.tron.network}/v1/accounts/${address}/transactions/trc20`,
		);
		const data = await response.json();
		return await this.sumTokenAmount(data, String(this.address));
	}

	public async getLastTransaction(address: string) {
		const url = `${config.tron.network}/v1/accounts/${address}/transactions/trc20?contract_address=${this.address}`;
		const res = await fetch(url);
		const res_data = await res.json();
		console.log(res_data);
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
		to: string,
		amount: number,
		tronWeb: any,
		id: string,
	) {
		try {
			if (!(await this.controllForEnergy(to, id))) {
				const logService = new TronLogNotificationService();
				logService.notifyError("Energy controll failed", id);
				console.log("Energy controll failed");
				return;
			}

			if (!(await this.controllForBandwidth(amount, to, id))) {
				const logService = new TronLogNotificationService();
				logService.notifyError("Energy controll failed", id);
				console.log("Bandwidth controll failed");
				return;
			}

			const functionSelector = "transfer(address,uint256)";

			const amountInSun = tronWeb.toSun(amount);

			const parameter = [
				{ type: "address", value: to },
				{ type: "uint256", value: amountInSun },
			];

			const tx = await tronWeb.transactionBuilder.triggerSmartContract(
				this.address,
				functionSelector,
				{
					feeLimit: config.tron.fee_limit,
				},
				parameter,
			);
			const signedTx = await tronWeb.trx.sign(tx.transaction);

			await tronWeb.trx.sendRawTransaction(signedTx);

			return {
				txid: tx.txid,
				to: to,
				amount: amount,
				rawData: tx.transaction.raw_data,
				signature: tx.transaction.signature || [],
			};
		} catch (error: any) {
			console.error(`Transaction failed - ${error.message}`);
			const logService = new TronLogNotificationService();
			logService.notifyError(error.message, id);
		}
	}

	private async controllForEnergy(to: string, id: string) {
		const address = await this.getAccount();
		const tronWeb = new TronWeb({ fullHost: this.network });
		const ReFee = new ReFeeService();
		const logService = new TronLogNotificationService();

		const energyRequired = await ReFee.calculateEnergy(to);

		console.log(`Controll for energy in process, required ${energyRequired}`);
		logService.notifyStatus(
			`Controll for energy in process, required ${energyRequired}`,
			id,
		);
		let res = await tronWeb.trx.getAccountResources(address);

		let energyLeft = Math.max(
			0,
			(res.EnergyLimit ?? 0) - (res.EnergyUsed ?? 0),
		);

		if (energyLeft >= energyRequired) {
			return true;
		}

		const expectedEnergy = energyRequired - energyLeft;
		console.log(`Not enough energy, renting ${expectedEnergy} from Re:Fee`);
		logService.notifyStatus(
			`Not enough energy, renting ${expectedEnergy} from Re:Fee`,
			id,
		);

		await ReFee.rentResource(address, expectedEnergy, "energy", "1h");

		for (let i = 0; i < 10; i++) {
			await new Promise((r) => setTimeout(r, 1000));

			res = await tronWeb.trx.getAccountResources(address);
			energyLeft = Math.max(0, (res.EnergyLimit ?? 0) - (res.EnergyUsed ?? 0));

			if (energyLeft >= energyRequired) {
				return true;
			}
		}

		return false;
	}

	private async controllForBandwidth(amount: number, to: string, id: string) {
		const address = await this.getAccount();
		const tronWeb = new TronWeb({ fullHost: this.network });
		const ReFee = new ReFeeService();
		const logService = new TronLogNotificationService();

		const bandwidthRequired = await this.calculateBandwidth(amount, to);
		console.log(
			`Controll for bandwidth in process, required ${bandwidthRequired}`,
		);
		logService.notifyStatus(
			`Controll for bandwidth in process, required ${bandwidthRequired}`,
			id,
		);

		let res = await tronWeb.trx.getAccountResources(address);

		let freeLeft = Math.max(
			0,
			(res.freeNetLimit ?? 0) - (res.freeNetUsed ?? 0),
		);

		let netLeft = Math.max(0, (res.NetLimit ?? 0) - (res.NetUsed ?? 0));

		let totalLeft = freeLeft + netLeft;

		if (totalLeft >= bandwidthRequired) {
			if (freeLeft < bandwidthRequired) {
				console.warn("Free bandwidth not enough, delegated will be used");
			}
			return true;
		}

		let expectedBandwidth = bandwidthRequired - totalLeft;

		/**
		 * Это временное решение, пока не будут согласованы кастомные лимиты
		 */

		if (expectedBandwidth < 1000) {
			expectedBandwidth = 1000;
		}

		console.log(`Not enough bandwidth, renting ${expectedBandwidth}`);
		logService.notifyStatus(
			`Not enough bandwidth, renting ${expectedBandwidth}`,
			id,
		);

		await ReFee.rentResource(address, expectedBandwidth, "bandwidth", "1h");

		for (let i = 0; i < 10; i++) {
			await new Promise((r) => setTimeout(r, 1000));

			res = await tronWeb.trx.getAccountResources(address);

			freeLeft = Math.max(0, (res.freeNetLimit ?? 0) - (res.freeNetUsed ?? 0));

			netLeft = Math.max(0, (res.NetLimit ?? 0) - (res.NetUsed ?? 0));

			totalLeft = freeLeft + netLeft;

			if (totalLeft >= bandwidthRequired) {
				console.log("Bandwidth successfully obtained");
				return true;
			}
		}

		return false;
	}

	private async calculateBandwidth(amount: number, to: string) {
		const BASE_BANDWIDTH = 195;

		const tronWeb = new TronWeb({
			fullHost: this.network,
		});

		const functionSelector = "transfer(address,uint256)";

		const amountInSun = tronWeb.toSun(amount);

		const parameter = [
			{ type: "address", value: to },
			{ type: "uint256", value: amountInSun },
		];

		const address = await this.getAccount();

		const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
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
}
