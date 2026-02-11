import { Worker } from "bullmq";
import {
	NotificationData,
	NotificationTypes,
} from "../Queues/NorificationQueue";
import { getRedis } from "../../../../Core/redis/redis";
import client from "../../../../Core/client/client";
import config from "../../../../Core/config/config";
import { logger } from "../../../../Core/logger/logger";
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
		logger.info(
			{ type: data.type, callback: data.callback },
			"sending notification",
		);

		switch (data.type) {
			case NotificationTypes.TRANSACTION_CRYPTO_TO_FIAT_PAYMENT_RECEIVED:
				return this.sendNotificationPayment(data);

			case NotificationTypes.TRANSACTION_FIAT_TO_CRYPTO_COMPLETED:
				return this.sendNotificationFCCompleted(data);

			case NotificationTypes.TRANSACTION_CRYPTO_TO_FIAT_COMPLETED:
				return this.sendNotificationCFCompleted(data);

			default:
				throw new Error(`unsupported notification type ${data.type}`);
		}
	}

	private async sendNotificationCFCompleted(data: NotificationData) {
		await client.post(`${data.callback}/api/transactions/webhook/cf/completed`, data, {
				headers: {
					"Content-Type": "application/json",
					"X-Signature": await this.sign(data),
				},
			},
		);
	}

	private async sendNotificationFCCompleted(data: NotificationData) {
		await client.post(`${data.callback}/api/transactions/webhook/fc/completed`, data, {
			headers: {
				"Content-Type": "application/json",
				"X-Signature": await this.sign(data),
			},
		});
	}

	private async sendNotificationPayment(data: NotificationData) {
		await client.post(`${data.callback}/api/transactions/webhook/payments`, data, {
				headers: {
					"Content-Type": "application/json",
					"X-Signature": await this.sign(data),
				},
			},
		);
	}

	private async sign(data: NotificationData) {
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
