import { Worker } from "bullmq";
import { PollingBalanceJobData } from "../PollingService";
import config from "../../../Core/config/config";
import { getRedis } from "../../../Core/redis";
import CryptoServiceFactory from "../../../Services/CryptoServiceFactory";
import NotificationService from "../../../Services/Notification/NotificationService";
import BalanceQueue from "../Queues/BalanceQueue";

/**
 * Worker для пуллинга баланса временного трон кошелька.
 * Используем при создании транзакции.
 * На данный момент поддерживается только TRX и USDT.
 */
export default class BalanceWorker {
	private worker: Worker<PollingBalanceJobData>;
	private factory: CryptoServiceFactory;
	private notification: NotificationService;
	private queue: BalanceQueue;

	constructor(
		queue: BalanceQueue,
		notification: NotificationService,
		factory: CryptoServiceFactory,
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
		this.queue = queue;
	}

	async pollBalanceJob(data: PollingBalanceJobData) {
		const network = data.network;
		const currency = data.currency;
		const type = data.type;
		const wallet = data.wallet;
		const targetAmount = data.targetAmount;
		const attempts = data.attempts;
		let balance: number;
		let txId: string;

		const service = await this.factory.createCryptoService(
			network,
			currency,
			type,
		);

		balance = Number(await service.getBalanceTR(wallet));

		this.notification.notifyLog({
			type: "tron - polling",
			level: "info",
			message: `polling attempt: ${attempts}, balance: ${balance}, targetAmount: ${targetAmount}, wallet: ${wallet}`,
			id: "",
		});

		if (balance >= targetAmount) {
			txId = await service.getLastTransaction(wallet);

			await this.notification.notifyPayment({
				wallet: wallet,
				balance: balance,
				txId: txId,
			});
			return;
		}

		/**
		 * Фреймворк ограничивает использование throw,
		 * поэтому проверка количества попыток выполняется вручную
		 */
		if (attempts < Number(config.polling.maxAttempts)) {
			await this.queue.addJob(
				{
					network: network,
					currency: currency,
					type: type,
					wallet: wallet,
					targetAmount: targetAmount,
					attempts: attempts + 1,
				},
				Number.parseInt(config.polling.interval, 10),
			);
		}
		return;
	}
}
