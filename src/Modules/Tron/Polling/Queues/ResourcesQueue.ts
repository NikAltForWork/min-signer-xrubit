import { Queue } from "bullmq";
import config from "../../../../Core/config/config";
import { getRedis } from "../../../../Core/redis";

/**
 * Данные для проаерки ресурсов.
 * Парметр isCryptoToFiat = 1 | 0
 * определяет какая функция будет вызвана
 * на последнем этапе транзакции
 */
export interface PollingResourcesJobData {
	id: string;
	network: string;
	currency: string;
	type: string;
	to: string;
	wallet: string;
	balance: string;
	attempts: number;
	isCryptoToFiat: boolean;
	targetEnergy: number;
	targetBandwidth: number;
	callback: string;
}

/**
 * Очередь для проверок ресурсов tron кошелька.
 * Она нужна для контроля поступления энергии и bandiwdth
 * от Re:Fee перед завершением транзакции
 */

export default class ResourcesQueue {
	private queue: Queue<PollingResourcesJobData>;

	constructor() {
		this.queue = new Queue<PollingResourcesJobData>("polling-resources", {
			connection: getRedis(),
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

	public async addJob(
		data: PollingResourcesJobData,
		id: string,
		delay?: number,
	) {
		return this.queue.add("polling-resources", data, {
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

		if (job) {
			await job.remove();
			return true;
		}
		return false;
	}
}
