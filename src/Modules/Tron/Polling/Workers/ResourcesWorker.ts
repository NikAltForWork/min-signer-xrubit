import { Worker } from "bullmq";
import ResourcesQueue, {
	PollingResourcesJobData,
} from "../Queues/ResourcesQueue";
import config from "../../../../Core/config/config";
import { getRedis } from "../../../../Core/redis";
import CryptoServiceFactory from "../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
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

        /**
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
        */

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
            if(data.isCryptoToFiat === 1) {
			    await service.finishControlledTransaction(wallet, balance, id);
            } else {
                const amount = Number.parseFloat(balance);
                await service.finishFiatToCryptoTransaction({network: network, currency: currency, type: type, id: id, to: wallet, amount: amount});
            }
		} else {
            throw new Error("AWAITING_RES");
        }
	}

    async shutdown() {
        await this.worker.close();
    }

}
