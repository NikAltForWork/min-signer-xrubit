import TronWeb from "tronweb";
import type { RedisCommander } from "ioredis";
import { getRedis } from "./redis";
import config from "./config/config";

export default class TronBasicService {
	protected connection: RedisCommander;
	protected privateKey: string;
	protected network: string;
	protected tronWeb: typeof TronWeb;

	constructor(privateKey: string) {
		this.connection = getRedis();
		this.privateKey = privateKey;
		this.network = config.tron.network;
		this.tronWeb = new TronWeb({
			fullHost: config.tron.network,
			headers: { "TRON-PRO-API-KEY": config.tron.key },
		});
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
}
