import TronWeb from "tronweb";
import type { RedisCommander } from "ioredis";
import { getRedis } from "./redis";
import config from "./config/config";
import ReFeeService from "../Services/Tron/ReFeeService";
import BalanceQueue from "../Services/Polling/Queues/BalanceQueue";
import ResourcesQueue from "../Services/Polling/Queues/ResourcesQueue";

export default class TronBasicService {
	protected connection: RedisCommander;
	protected privateKey: string;
	protected network: string;
	protected tronWeb: typeof TronWeb;
	protected reFee: ReFeeService;
	protected balance_queue: BalanceQueue;
	protected resource_queue: ResourcesQueue;

	constructor(
		privateKey: string,
		balance_queue: BalanceQueue,
		resource_queue: ResourcesQueue,
	) {
		this.connection = getRedis();
		this.privateKey = privateKey;
		this.network = config.tron.network;
		this.tronWeb = new TronWeb({
			fullHost: config.tron.network,
			headers: { "TRON-PRO-API-KEY": config.tron.key },
		});
		this.reFee = new ReFeeService();
		this.balance_queue = balance_queue;
		this.resource_queue = resource_queue;
	}

	async createAccount() {
		const account = await this.tronWeb.createAccount();
		return account;
	}

	async getAccount() {
		return this.tronWeb.address.fromPrivateKey(this.privateKey);
	}

	validateAddress(address: string) {
		return this.tronWeb.isAddress(address);
	}

	toHexAddress(address: string) {
		return this.tronWeb.address.toHex(address);
	}

	fromHexAddress(hexAddress: string) {
		return this.tronWeb.address.fromHex(hexAddress);
	}

	async getLastTransaction(wallet: string) {
		return wallet;
	}
}
