import client from "../../Core/Client";
import config from "../../Core/config/config";
import * as crypto from "node:crypto";

interface NotificationPaymentData {
	wallet: string;
	balance: number;
	txId: string;
}

interface NotificationLogData {
	type: string;
	level: string;
	message: string;
	id: string;
}

export default class NotificationService {
	public async notifyLog(data: NotificationLogData) {
		try {
			const body = {
				level: data.level,
				service: `signer - ${data.type}`,
				env: config.server.env,
				message: data.message,
				context: {
					id: data.id,
				},
			};

			await client.post("api/kms/log", body, {
				headers: {
					"X-Signature": await this.sign(body),
				},
			});
		} catch (error: any) {
			console.log(error.message);
			throw error;
		}
	}

	public async notifyPayment(data: NotificationPaymentData) {
		try {
			await client.post(
				//axios клиент
				"/api/transactions/webhook/payments",
				data,
				{
					headers: {
						"Content-Type": "application/json",
						"X-Signature": await this.sign(data),
					},
				},
			);
		} catch (error: any) {
			console.log(error.message);
			throw error;
		}
	}

	private async sign(data: any) {
		const body = JSON.stringify(data);

		const signature = crypto
			.createHmac("sha256", config.client.secret)
			.update(body)
			.digest("hex");

		return signature;
	}
}
