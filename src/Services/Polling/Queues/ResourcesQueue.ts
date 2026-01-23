import { Queue } from "bullmq";
import config from "../../../Core/config/config";

/**
 * Данные для проаерки ресурсов, могут измениться
 */
export interface PollingResourcesJobData {
	id: string;
	network: string;
	currency: string;
	type: string;
	wallet: string;
	balance: string;
	attempts: number;
	isRequested: number;
	targetEnergy: number;
	targetBandwidth: number;
}

/**
 * Очередь для проверок ресурсов tron кошелька.
 * Она нужна для контроля поступления энергии и bandiwdth
 * от Re:Fee перед завершением транзакции
 */

export default class ResourcesQueue {
	public queue: Queue<PollingResourcesJobData>;

	constructor() {
		this.queue = new Queue<PollingResourcesJobData>("polling-resources", {
			connection: {
				host: config.redis.host,
				port: Number(config.redis.port),
				password: config.redis.password,
				maxRetriesPerRequest: null,
			},
			defaultJobOptions: {
				removeOnComplete: true,
				removeOnFail: true,
				attempts: 3,
				backoff: {
					type: "exponential",
					delay: 30000,
				},
			},
		});
	}

	async addJob(data: PollingResourcesJobData, delay?: number) {
		return this.queue.add("polling-resources", data, {
			delay: delay || 0,
			attempts: Number.parseInt(config.polling.maxAttempts, 10),
			backoff: {
				type: "fixed",
				delay: Number.parseInt(config.polling.interval, 10),
			},
		});
	}
}
