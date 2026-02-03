import { Worker } from "bullmq";
import axios from "axios";
import { PollingActivationData } from "../Queues/ActivationQueue";
import CryptoServiceFactory from "../../../CryptoServiceFactory";
import { getRedis } from "../../../../Core/redis";
import config from "../../../../Core/config/config";
import { logger } from "../../../../Core/logger";

export default class ActivationWorker {
	private worker: Worker<PollingActivationData>;
	private factory: CryptoServiceFactory;

	constructor(factory: CryptoServiceFactory) {
		this.worker = new Worker<PollingActivationData>(
			"polling-activation",
			async (job) => {
				await this.checkActivation(job.data);
			},
			{
				connection: getRedis(),
			},
		);
		this.factory = factory;

		this.worker.on("active", (job) => {
			logger.info(
				{
					jobId: job.id,
					attempts: job.attemptsMade,
					action: "job_active",
				},
				`Activation check job ${job.id} for ${job.data.to} is now active`,
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
				`Activation check job ${job?.id} marked as Failed`,
			);
		});

		this.worker.on("completed", (job) => {
			logger.debug(
				{
					jobId: job?.id,
					attempts: job.attemptsMade,
					action: "job_removed",
				},
				`Activation check job ${job.id} removed from queue`,
			);
		});
	}

	private async checkActivation(data: PollingActivationData) {
		const wallet = data.to;
		const network = data.network;
		const currency = data.currency;
		const type = data.type;
		const id = data.id;
		const amount = data.amount;
		const callback = data.callback;

		const response = await axios.get(
			`${config.tron.network}/v1/accounts/${wallet}`,
			{
				headers: {
					Accept: "application/json",
					"TRON-PRO-API-KEY": config.tron.key,
				},
			},
		);

		const isActive = response.data.data.length > 0;

		if (!isActive) {
			throw new Error("WALLET_NOT_ACTIVE");
		}

		const service = await this.factory.createCryptoService(
			network,
			currency,
			type,
		);

		await service.finishActivationControl({
			network: network,
			currency: currency,
			type: type,
			to: wallet,
			amount: amount,
			id: id,
			isCryptoToFiat: true,
			callback: callback,
		});
	}

	public async shutdown() {
		await this.worker.close();
	}
}
