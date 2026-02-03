import { Queue } from "bullmq";
import config from "../../../../Core/config/config";
import { getRedis } from "../../../../Core/redis";

export interface PollingActivationData {
	network: string;
	currency: string;
	type: string;
	to: string;
	amount: string;
	id: string;
	callback: string;
}

/**
 * Очередь для пулинга статуса активации одноразового кошелька.
 * Используется в Крипто-Фиат транзакциях для проверки активации
 * одноразового кошелька перед запросом ресурсов у Re:Fee
 */
export default class ActivationQueue {
	private queue: Queue;

	constructor() {
		this.queue = new Queue<PollingActivationData>("polling-activation", {
			connection: getRedis(),
			defaultJobOptions: {
				removeOnFail: true,
				removeOnComplete: true,
			},
		});
	}

	public async addJob(data: PollingActivationData, id: string, delay?: number) {
		return this.queue.add("polling-activation", data, {
			delay: delay || 10,
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
