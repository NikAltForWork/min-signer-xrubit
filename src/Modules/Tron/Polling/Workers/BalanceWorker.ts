import { Worker } from "bullmq";
import { PollingBalanceJobData } from "../Queues/BalanceQueue";
import { getRedis } from "../../../../Core/redis";
import CryptoServiceFactory from "../../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import BalanceQueue from "../Queues/BalanceQueue";
import NotificationQueue from "../../Notification/Queues/NorificationQueue";
import { logger } from "../../../../Core/logger";

/**
 * Worker для пуллинга баланса временного трон кошелька.
 * Используем при создании транзакции.
 * На данный момент поддерживается только TRX и USDT.
 */
export default class BalanceWorker {
	private worker: Worker<PollingBalanceJobData>;
	private factory: CryptoServiceFactory;
	private notification: NotificationQueue;
	private queue: BalanceQueue;
	private log: NotificationService;

	constructor(
		queue: BalanceQueue,
		notification: NotificationQueue,
		factory: CryptoServiceFactory,
		log: NotificationService,
	) {
		this.worker = new Worker<PollingBalanceJobData>(
			"polling-balance",
			async (job) => {
				await this.pollBalanceJob(job.data);
			},
			{
				connection: getRedis(),
			},
		);
		this.factory = factory;
		this.notification = notification;
		this.log = log;
		this.queue = queue;

		this.worker.on("active", (job) => {
			logger.info(
				{
					jobId: job.id,
					attempts: job.attemptsMade,
					action: "job_active",
					contract: job.data.contract,
				},
				`Balance check job ${job.id} - wallet: ${job.data.wallet}, target ammount: ${job.data.targetAmount}`,
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
				`Balance check job ${job?.id} marked as Failed`,
			);
		});

		this.worker.on("completed", (job) => {
			logger.debug(
				{
					jobId: job?.id,
					attempts: job.attemptsMade,
					action: "job_removed",
				},
				`Balance check job ${job.id} removed from queue`,
			);
		});
	}

	async pollBalanceJob(data: PollingBalanceJobData) {
		const network = data.network;
		const currency = data.currency;
		const type = data.type;
		const wallet = data.wallet;
		const targetAmount = data.targetAmount;
		const attempts = data.attempts;
		const contract = data.contract;
		const callback = data.callback;
		let balance: number;
		let txId: string;

		const service = await this.factory.createCryptoService(
			network,
			currency,
			type,
		);

		balance = Number(await service.getBalanceTR(wallet));

		if (balance >= targetAmount) {
			txId = await service.getLastTransaction(wallet);

			await this.notification.addJob({
				callback: callback,
				wallet: wallet,
				balance: balance,
				txId: txId,
				contract: contract,
			});
			return;
		}

		throw new Error("BALANCE_NOT_REACHED_TARGET");
	}

	async shutdown() {
		await this.worker.close();
	}
}
