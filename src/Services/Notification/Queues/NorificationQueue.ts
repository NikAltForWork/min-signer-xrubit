import { Queue } from "bullmq";
import config from "../../../Core/config/config";

export interface NotificationData {
	wallet: string;
	balance: number;
	txId: string;
}
/**
* Очередь для сообщений об успешной оплате
* Крипто-Фиат транзакций
*/
export default class NotificationQueue {
	private queue: Queue<NotificationData>;

	constructor() {
		this.queue = new Queue<NotificationData>("notification-payment", {
			connection: {
				host: config.redis.host,
				port: Number(config.redis.port),
				password: config.redis.password,
				maxRetriesPerRequest: null,
			},
			defaultJobOptions: {
				removeOnFail: 100,
				removeOnComplete: 100,
			},
		});
	}

	public async addJob(data: NotificationData, delay?: number) {
		this.queue.add("notification-payment", data, {
			delay: delay || 0,
			attempts: Number.parseInt(config.polling.maxAttempts, 10),
			backoff: {
				type: "fixed",
				delay: Number.parseInt(config.polling.interval, 10),
			},
		});
	}
}
