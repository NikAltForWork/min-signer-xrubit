import { Worker } from "bullmq";
import { NotificationData } from "../Queues/NorificationQueue";
import { getRedis } from "../../../../Core/redis";
import client from "../../../../Core/client";
import config from "../../../../Core/config/config";
import { logger } from "../../../../Core/logger";
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

		this.worker.on("active", (job) => {
			logger.info(
				{
					jobId: job?.id,
					attempts: job.attemptsMade,
					action: "job_active",
				},
				`Notification job ${job?.id} is now active`,
			);
		});

		this.worker.on("failed", (job, error) => {
			logger.warn(
				{
					jobId: job?.id,
					error: error.message,
					attempts: job?.attemptsMade,
					action: "job_failed",
				},
				`Notification job ${job?.id} marked as Failed`,
			);
		});

		this.worker.on("completed", (job) => {
			logger.debug(
				{
					jobId: job?.id,
					attempts: job.attemptsMade,
					action: "job_removed",
				},
				`Notification job ${job.id} removed from queue`,
			);
		});
	}

	private async sendNotification(data: NotificationData) {
		await client.post(`${data.callback}/api/transactions/webhook/payments`, data, {
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
