import ActivationQueue from "../Polling/Queues/ActivationQueue";
import BalanceQueue from "../Polling/Queues/BalanceQueue";
import ResourcesQueue from "../Polling/Queues/ResourcesQueue";
import { logger } from "../../../Core/logger";

/**
 * Сервис для контроля жизненного цикла
 * транзакции внутри сервиса
 */
export default class TronTransactionService {
	private resource_queue: ResourcesQueue;
	private balance_queue: BalanceQueue;
	private activation_queue: ActivationQueue;

	constructor(
		resource_queue: ResourcesQueue,
		balance_queue: BalanceQueue,
		activation_queue: ActivationQueue,
	) {
		this.resource_queue = resource_queue;
		this.balance_queue = balance_queue;
		this.activation_queue = activation_queue;
	}

	public async cancelTransaction(id: string) {
		const queues = [
			this.resource_queue,
			this.balance_queue,
			this.activation_queue,
		];

		const results = await Promise.all(
			queues.map(async (queue) => {
				try {
					return await queue.removeJob(id);
				} catch (error) {
					logger.error(
						`Error canceling transaction ${id} from queue: ${error}`,
					);
					return false;
				}
			}),
		);

		const isCanceled = results.some((result) => result === true);

		if (isCanceled) {
			logger.info(`Transaction canceled ${id}`);
		} else {
			logger.warn(`Transaction ${id} not found in any queue`);
		}

		return isCanceled;
	}
}
