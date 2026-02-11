import client from "../../../Core/client/client";
import config from "../../../Core/config/config";
import { logger } from "../../../Core/logger/logger";
import * as crypto from "node:crypto";

interface NotificationLogData {
	type: string;
	level: string;
	message: string;
	id: string;
}

interface NotificationStatusData {
	callback: string;
	id: string;
	tx_id: string;
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

			/**
			await client.post("api/kms/log", body, {
				headers: {
					"X-Signature": await this.sign(body),
				},
			});
            */
		} catch (error: any) {
			console.log(error.message);
			throw error;
		}
	}

	public async notifyStatus(data: NotificationStatusData) {
		try {
			const body = {
				tx_id: data.tx_id,
			};

			await client.post(`${data.callback}/api/kms/${data.id}/confirm`, body, {
				headers: {
					"Content-Type": "application/json",
					"X-Signature": await this.sign(body),
				},
			});
		} catch (error: any) {
			logger.error(
				{
					id: data.id,
					error: error.message,
				},
				`Failed to send notfiication to ${data.callback}`,
			);
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
