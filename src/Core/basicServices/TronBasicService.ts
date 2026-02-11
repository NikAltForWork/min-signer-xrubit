import TronWeb from "tronweb";
import type { Redis, RedisCommander } from "ioredis";
import config from "../config/config";
import ReFeeService from "../../Modules/Tron/Services/ReFeeService";
import BalanceQueue from "../../Modules/Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "../../Modules/Tron/Polling/Queues/ResourcesQueue";
import ActivationQueue from "../../Modules/Tron/Polling/Queues/ActivationQueue";
import NotificationQueue from "../../Modules/Tron/Notification/Queues/NorificationQueue";

export type TronBasicDependencies = {
	redis: Redis;
	privateKey: string;
	reFeeService: ReFeeService;
	balance_queue: BalanceQueue;
	resources_queue: ResourcesQueue;
	activation_queue: ActivationQueue;
    notification_queue: NotificationQueue;
};

export default class TronBasicService {
	protected connection: RedisCommander;
	protected privateKey: string;
	protected network: string;
	protected tronWeb: typeof TronWeb;
	protected reFee: ReFeeService;
	protected balance_queue: BalanceQueue;
	protected resource_queue: ResourcesQueue;
	protected activation_queue: ActivationQueue;
    protected notification_queue: NotificationQueue;

	constructor({
		redis,
		privateKey,
		reFeeService,
		balance_queue,
		resources_queue,
		activation_queue,
        notification_queue,
	}: TronBasicDependencies) {
		this.connection = redis;
		this.privateKey = privateKey;
		this.network = config.tron.network;
		this.tronWeb = new TronWeb({
			fullHost: config.tron.network,
			privateKey: privateKey,
			headers: { "TRON-PRO-API-KEY": config.tron.key },
		});
		this.reFee = reFeeService;
		this.balance_queue = balance_queue;
		this.resource_queue = resources_queue;
		this.activation_queue = activation_queue;
        this.notification_queue = notification_queue;
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
