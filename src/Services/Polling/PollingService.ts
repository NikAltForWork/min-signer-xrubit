import { Queue, Worker } from "bullmq";
import client from "../../Core/Client";
import { getRedis } from "../../Core/redis";
import CryptoServiceFactory from "../CryptoServiceFactory";
import config from "../../Core/config/config";
import type { RedisCommander } from "ioredis";
import * as crypto from "node:crypto";

/**
 * Данные для опроса баланса трон кошелька
 */
export interface PollingBalanceJobData {
	network: string;
	currency: string;
	type: string;
	wallet: string;
	targetAmount: number;
	attempts: number;
}

export interface PollingResourcesJobData {
	todo: string;
}

/**
 * Данные для отправки уведомления на main
 */

interface NotificationData {
	wallet: string;
	balance: number;
	txId: string;
}

export default class PollingService {
	public factory: CryptoServiceFactory;
	public interval: number;
	public attempts: number;
	public connection: RedisCommander;
	public queue: Queue<PollingBalanceJobData>;
	public balance_worker: Worker<PollingBalanceJobData>;
	public resource_worker: Worker<PollingResourcesJobData>;

	constructor() {
		this.factory = new CryptoServiceFactory();
		this.interval = Number(config.polling.interval);
		this.attempts = Number(config.polling.maxAttempts);
		this.connection = getRedis();
		this.queue = new Queue("polling", {
			connection: {
				host: config.redis.host,
				port: Number(config.redis.port),
				password: config.redis.password,
				maxRetriesPerRequest: null,
			},
			defaultJobOptions: {
				removeOnComplete: 100,
				removeOnFail: 100,
			},
		});
		this.balance_worker = new Worker<PollingBalanceJobData>(
			"polling",
			async (job) => {
				this.pollBalanceJob(job.data);
			},
			{
				connection: this.connection as any,
			},
		);

		this.resource_worker = new Worker<PollingResourcesJobData>(
			"polling",
			async (job) => {
				//todo
			},
			{
				connection: this.connection as any,
			},
		);
	}

	async pollBalanceJob(data: PollingBalanceJobData) {
		const network = data.network;
		const currency = data.currency;
		const type = data.type;
		const wallet = data.wallet;
		const targetAmount = data.targetAmount;
		const attempts = data.attempts;
		var balance: number;
		var txId: string;
		const service = await this.factory.createCryptoService(
			network,
			currency,
			type,
		);

		balance = Number(await service.getBalanceTR(wallet));

		console.log(
			`polling attempt: ${attempts}, balance: ${balance}, targetAmount: ${targetAmount}, wallet: ${wallet}`,
		);

		if (balance >= targetAmount) {
			txId = await service.getLastTransaction(wallet);
			console.log(txId);
			console.log(`polling attempt ${attempts} succeded, balance: ${balance}`);
			await this.sendNotification({
				wallet: wallet,
				balance: balance,
				txId: txId,
			});
			return [];
		}
		//fastify ограничивает возможность использовать throw, потому проверка на колличество попыток ручная
		if (attempts <= Number(config.polling.maxAttempts)) {
			await this.queue.add(
				"polling",
				{
					network: network,
					currency: currency,
					type: type,
					wallet: wallet,
					targetAmount: targetAmount,
					attempts: attempts + 1,
				},
				{
					delay: this.interval,
				},
			);
		}
		return;
	}

	async processWallet(
		network: string,
		currency: string,
		type: string,
		wallet: any,
		targetAmount: number,
	) {
		const data = await JSON.stringify(wallet);
		console.log(data);
		const ttl = config.polling.keyTtl;
		await this.connection.set(
			`wallet:${wallet.address.base58}`,
			data,
			"EX",
			ttl,
			"NX",
		);

		await this.queue.add(
			"polling",
			{
				network: network,
				currency: currency,
				type: type,
				wallet: wallet.address.base58,
				targetAmount: targetAmount,
				attempts: 1,
			},
			{
				delay: this.interval,
			},
		);
	}

	async sendNotification(data: NotificationData) {
		try {
			const body = JSON.stringify(data);

			const signature = crypto
				.createHmac("sha256", config.client.secret)
				.update(body)
				.digest("hex");

			const response = await client.post(
				//axios клиент
				"/api/transactions/webhook/payments",
				body,
				{
					headers: {
						"Content-Type": "application/json",
						"X-Signature": signature,
					},
				},
			);

			return response.data;
		} catch (error: any) {
			console.log(error.message);
		}
	}
}
