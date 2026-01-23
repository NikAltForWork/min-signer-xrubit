import { Worker } from "bullmq";
import ResourcesQueue, {
	PollingResourcesJobData,
} from "../Queues/ResourcesQueue";
import config from "../../../Core/config/config";
import { getRedis } from "../../../Core/redis";
import CryptoServiceFactory from "../../../Services/CryptoServiceFactory";
import NotificationService from "../../../Services/Notification/NotificationService";
import ReFeeService from "../../../Services/Tron/ReFeeService";
import TronWeb from "tronweb";

/**
 * Worker для пуллинга ресурсов временного трон кошелька.
 * Используем при создании транзакции.
 * На данный момент поддерживается только TRX и USDT.
 */
export default class ResourcesWorker {
	private worker: Worker<PollingResourcesJobData>;
	private factory: CryptoServiceFactory;
	private notification: NotificationService;
	//private queue: ResourcesQueue;
	private tronWeb: typeof TronWeb;

	constructor(
		//queue: ResourcesQueue,
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
		//this.queue = queue;
		this.tronWeb = new TronWeb({
			fullHost: config.tron.network,
			headers: {
				"TRON-PRO-API-KEY": config.tron.key,
			},
		});
	}

	async pollResourcesJob(data: PollingResourcesJobData) {
		const id = data.id;
		const wallet = data.wallet;
		const balance = data.balance;
		const attempts = data.attempts;
		const targetEnergy = data.targetEnergy;
		const targetBandwidth = data.targetBandwidth;

		const isRequested = data.isRequested;

		const network = data.network;
		const currency = data.currency;
		const type = data.type;

        /**
		if (attempts >= Number.parseInt(config.polling.maxAttempts)) {
			return;
		}
        */

		if (isRequested !== 1) {
			this.notification.notifyLog({
				level: "info",
				type: "polling",
				message: "Запрос ресурсов ресурсов у Re:Fee...",
				id: id,
			});
			const reFeeService = new ReFeeService();

			await reFeeService.rentResource(wallet, targetEnergy, "energy", "1h");

			await reFeeService.rentResource(
				wallet,
				targetBandwidth,
				"bandwidth",
				"1h",
			);

            /**
			if (attempts < Number.parseInt(config.polling.maxAttempts)) {
				this.queue.addJob(
					{
						id: id,
						network: network,
						currency: currency,
						type: type,
						wallet: wallet,
						balance: balance,
						attempts: attempts + 1,
						targetEnergy: targetEnergy,
						targetBandwidth: targetBandwidth,
						isRequested: 1,
					},
					Number.parseInt(config.polling.interval, 10),
				);
			}
			return;
            */

            throw new Error("Ожидание ресурсов");
		}

		this.notification.notifyLog({
			level: "info",
			type: "polling",
			message: `Ожидание поступления ресурсов на ${wallet}...`,
			id: id,
		});

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

		if (energyLeft >= targetEnergy) {
			// отсюда вызвать другой метод
		} else {
			isChecked = 0;
		}

		if (isChecked === 0) {
            /**
			if (attempts <= Number.parseInt(config.polling.maxAttempts)) {
				this.queue.addJob(
					{
						id: id,
						network: network,
						currency: currency,
						type: type,
						wallet: wallet,
						balance: balance,
						attempts: attempts + 1,
						targetEnergy: targetEnergy,
						targetBandwidth: targetBandwidth,
						isRequested: 1,
					},
					Number.parseInt(config.polling.interval, 10),
				);
				return;
			}
			return;
            */
            throw new Error("Ожидание ресурсов...")
		}

		if (isChecked === 1) {
			this.notification.notifyLog({
				level: "info",
				type: "polling",
				message: "Запрос ресурсов успешно завершен",
				id: id,
			});
			const service = await this.factory.createCryptoService(
				network,
				currency,
				type,
			);
			await service.finishControlledTransaction(wallet, balance, id);
            return;
		}

		throw new Error("Ожидание ресурсов...");
	}
}
