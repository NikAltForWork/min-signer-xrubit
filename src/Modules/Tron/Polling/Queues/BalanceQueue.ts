import { Queue } from "bullmq";
import config from "../../../../Core/config/config";
import { getRedis } from "../../../../Core/redis";

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
	callback: string;
}

/**
 * Очередь для проверки баланса временного кошелька.
 * Она нужна для проверки поступления средств
 * на временный кошелек перед переходом на мледующий этап.
 */
export default class BalanceQueue {
	private queue: Queue<PollingBalanceJobData>;

	constructor() {
		this.queue = new Queue<PollingBalanceJobData>("polling-balance", {
			connection: getRedis(),
			defaultJobOptions: {
				removeOnComplete: true,
				removeOnFail: true,
			},
		});
	}

	public async addJob(data: PollingBalanceJobData, id: string, delay?: number) {
		return this.queue.add("polling-balance", data, {
			delay: delay || 0,
			attempts: Number.parseInt(config.polling.maxAttempts, 10),
			backoff: {
				type: "fixed",
				delay: Number.parseInt(config.polling.interval, 10),
			},
			jobId: id,
		});
	}

	public async removeJob(id: string): Promise<boolean> {
		const job = await this.queue.getJob(id);

		if (!job) {
			return false;
		}

		await job.remove();
		return true;
	}
}
