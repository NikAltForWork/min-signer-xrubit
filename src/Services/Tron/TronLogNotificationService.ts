import client from "../../Core/Client";
import config from "../../Core/config/config";
import * as crypto from "node:crypto";

export default class TronLogNotificationService {
	public async notifyError(message: string, id: string) {
		try {
			const body = {
				level: "error",
				service: "signer - tron",
				env: config.server.env,
				message: message,
				context: {
					id: id,
				},
			};

			await client.post("api/kms/log", body, {
				headers: {
					"X-Signature": await this.sign(body),
				},
			});
		} catch (error: any) {
			console.log(error.message);
		}
	}

	public async notifyStatus(message: string, id: string) {
		try {
			const body = {
				level: "info",
				service: "signer - tron",
				env: config.server.env,
				message: message,
				context: {
					id: id,
				},
			};

			await client.post("api/kms/log", body, {
				headers: {
					"X-Signature": await this.sign(body),
				},
			});
		} catch (error: any) {
			console.log(error.message);
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
