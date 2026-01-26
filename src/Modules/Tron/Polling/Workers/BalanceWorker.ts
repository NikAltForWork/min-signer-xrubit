import { Worker } from "bullmq";
import { PollingBalanceJobData } from "../Queues/BalanceQueue";
import config from "../../../../Core/config/config";
import { getRedis } from "../../../../Core/redis";
import CryptoServiceFactory from "../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import BalanceQueue from "../Queues/BalanceQueue";
import NotificationQueue from "../../Notification/Queues/NorificationQueue";

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
	}

	async pollBalanceJob(data: PollingBalanceJobData) {
		const network = data.network;
		const currency = data.currency;
		const type = data.type;
		const wallet = data.wallet;
		const targetAmount = data.targetAmount;
		const attempts = data.attempts;
		const contract = data.contract;
		let balance: number;
		let txId: string;

		const service = await this.factory.createCryptoService(
			network,
			currency,
			type,
		);

		balance = Number(await service.getBalanceTR(wallet));

		this.log.notifyLog({
			type: "tron - polling",
			level: "info",
			message: `polling attempt: ${attempts}, balance: ${balance}, targetAmount: ${targetAmount}, wallet: ${wallet}, contract: ${config.tron.usdt_contract}`,
			id: "",
		});

		if (balance >= targetAmount) {
			txId = await service.getLastTransaction(wallet);

			await this.notification.addJob({
				wallet: wallet,
				balance: balance,
				txId: txId,
				contract: contract,
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

    async shutdown() {
        await this.worker.close();
    }

}
