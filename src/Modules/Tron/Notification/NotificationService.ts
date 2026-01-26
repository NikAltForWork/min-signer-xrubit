import client from "../../../Core/Client";
import config from "../../../Core/config/config";
import * as crypto from "node:crypto";

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

            console.log(`Local logs - ${body.message}`);
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

	private async sign(data: any) {
		const body = JSON.stringify(data);

		const signature = crypto
			.createHmac("sha256", config.client.secret)
			.update(body)
			.digest("hex");

		return signature;
	}
}
