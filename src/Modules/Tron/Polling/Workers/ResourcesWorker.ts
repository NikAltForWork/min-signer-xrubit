import { Worker } from "bullmq";
import ResourcesQueue, {
	PollingResourcesJobData,
} from "../Queues/ResourcesQueue";
import config from "../../../../Core/config/config";
import { getRedis } from "../../../../Core/redis";
import CryptoServiceFactory from "../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import TronWeb from "tronweb";
import { logger } from "../../../../Core/logger";

/**
 * Worker для пуллинга ресурсов временного трон кошелька.
 * Используем при создании транзакции.
 * На данный момент поддерживается только TRX и USDT.
 */
export default class ResourcesWorker {
	private worker: Worker<PollingResourcesJobData>;
	private factory: CryptoServiceFactory;
	private notification: NotificationService;
	private tronWeb: typeof TronWeb;

	constructor(
		notification: NotificationService,
		factory: CryptoServiceFactory,
	) {
		this.worker = new Worker<PollingResourcesJobData>(
			"polling-resources",
			async (job) => {
				await this.pollResourcesJob(job.data);
			},
			{
				connection: getRedis(),
				concurrency: 3,
				limiter: {
					max: 5,
					duration: 1000,
				},
			},
		);
		this.factory = factory;
		this.notification = notification;
		this.tronWeb = new TronWeb({
			fullHost: config.tron.network,
			headers: {
				"TRON-PRO-API-KEY": config.tron.key,
			},
		});

		this.worker.on("active", (job) => {
			logger.info(
				{
					jobId: job?.id,
					attempts: job.attemptsMade,
					action: "job_active",
					isCryptoToFiat: job.data.isCryptoToFiat,
				},
				`Resource check job ${job?.id} for transaction ${job.data.id} is now active`,
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
				`Resource check job ${job?.id} marked as Failed`,
			);
		});

		this.worker.on("completed", (job) => {
			logger.debug(
				{
					jobId: job?.id,
					attempts: job.attemptsMade,
					action: "job_removed",
				},
				`Resource check job ${job.id} removed from queue`,
			);
		});
	}

	async pollResourcesJob(data: PollingResourcesJobData) {
		const id = data.id;
		const wallet = data.wallet;
		const balance = data.balance;
		const targetEnergy = data.targetEnergy;
		const targetBandwidth = data.targetBandwidth;
		const network = data.network;
		const currency = data.currency;
		const type = data.type;
        const callback = data.callback;

        const to = data.to

		/**
		 * Проверка на пропускную способность кошелька
		 */

		let isChecked = 1;

		let res = await this.tronWeb.trx.getAccountResources(wallet);

		let freeLeft = Math.max(
			0,
			(res.freeNetLimit ?? 0) - (res.freeNetUsed ?? 0),
		);

		let netLeft = Math.max(0, (res.NetLimit ?? 0) - (res.NetUsed ?? 0));

		let totalLeft = freeLeft + netLeft;

		if (totalLeft >= targetBandwidth) {
			// todo
		} else {
			isChecked = 0;
		}

		/**
		 * Проверка энергии кошелька
		 */
		let energyLeft = Math.max(
			0,
			(res.EnergyLimit ?? 0) - (res.EnergyUsed ?? 0),
		);
        /**
        * Re:Fee иногда присылает не точное колличестово энергии
        * на этот случай считаем успешным пополнение баланса
        * хотя-бы на 90%
        */
        let controlledEnergy = targetEnergy - (targetEnergy * 0.1);
		if (energyLeft >= controlledEnergy) {
			// отсюда вызвать другой метод
		} else {
			isChecked = 0;
		}

        console.log(targetEnergy);

		if (isChecked === 1) {
			const service = await this.factory.createCryptoService(
				network,
				currency,
				type,
			);
			if (data.isCryptoToFiat === true) {
				await service.finishControlledTransaction({address: wallet, balance: balance, id: id});
			} else {
				await service.finishFiatToCryptoTransaction({
					network: network,
					currency: currency,
					type: type,
					id: id,
					to: to,
					amount: balance,
                    callback: callback
				});
			}
		} else {
			throw new Error("AWAITING_RES");
		}
	}

	async shutdown() {
		await this.worker.close();
	}
}
