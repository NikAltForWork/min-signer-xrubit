import { Queue } from "bullmq";
import config from "../../../Core/config/config";

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
	contract?: string;
}

/**
 * Очередь для проверки баланса временного кошелька.
 * Она нужна для проверки поступления средств
 * на временный кошелек перед переходом на мледующий этап.
 */
export default class BalanceQueue {
	public queue: Queue<PollingBalanceJobData>;

	constructor() {
		this.queue = new Queue<PollingBalanceJobData>("polling-balance", {
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
	}

	async addJob(data: PollingBalanceJobData, delay?: number) {
		return this.queue.add("polling-balance", data, {
			delay: delay || 0,
			attempts: Number.parseInt(config.polling.maxAttempts, 10),
			backoff: {
				type: "fixed",
				delay: Number.parseInt(config.polling.interval, 10),
			},
		});
	}
}
