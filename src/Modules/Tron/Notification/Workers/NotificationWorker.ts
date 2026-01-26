import { Worker } from "bullmq";
import { NotificationData } from "../Queues/NorificationQueue";
import { getRedis } from "../../../../Core/redis";
import client from "../../../../Core/Client";
import config from "../../../../Core/config/config";
import * as crypto from "node:crypto";

/**
 * Worker для доставки уведомлений об успешной оплате
 * Крипто-Фиат транзакции
 */
export default class NotificationWorker {
	private worker: Worker<NotificationData>;

	constructor() {
		this.worker = new Worker<NotificationData>(
			"notification-payment",
			async (job) => {
				await this.sendNotification(job.data);
			},
			{
				connection: getRedis(),
			},
		);
	}

	private async sendNotification(data: NotificationData) {
		await client.post("/api/transactions/webhook/payments", data, {
			headers: {
				"Content-Type": "application/json",
				"X-Signature": await this.sign(data),
			},
		});
	}

	private async sign(data: any) {
		const body = JSON.stringify(data);

		const signature = crypto
			.createHmac("sha256", config.client.secret)
			.update(body)
			.digest("hex");

		return signature;
	}

    async shutdown() {
        await this.worker.close();
    }

}
