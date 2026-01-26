import TronWeb from "tronweb";
import type { RedisCommander } from "ioredis";
import { getRedis } from "./redis";
import config from "./config/config";
import ReFeeService from "../Modules/Tron/Tron/ReFeeService";
import BalanceQueue from "../Modules/Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "../Modules/Tron/Polling/Queues/ResourcesQueue";
import ActivationQueue from "../Modules/Tron/Polling/Queues/ActivationQueue";

export default class TronBasicService {
	protected connection: RedisCommander;
	protected privateKey: string;
	protected network: string;
	protected tronWeb: typeof TronWeb;
	protected reFee: ReFeeService;
	protected balance_queue: BalanceQueue;
	protected resource_queue: ResourcesQueue;
    protected activation_queue: ActivationQueue;

	constructor(
		privateKey: string,
		balance_queue: BalanceQueue,
		resource_queue: ResourcesQueue,
        activation_queue: ActivationQueue,
	) {
		this.connection = getRedis();
		this.privateKey = privateKey;
		this.network = config.tron.network;
		this.tronWeb = new TronWeb({
			fullHost: config.tron.network,
            privateKey: privateKey,
			headers: { "TRON-PRO-API-KEY": config.tron.key },
		});
		this.reFee = new ReFeeService();
		this.balance_queue = balance_queue;
		this.resource_queue = resource_queue;
        this.activation_queue = activation_queue;
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

	public getContract() {
		return "";
	}
}
