import BalanceWorker from "../src/Modules/Tron/Polling/Workers/BalanceWorker";
import ActivationWorker from "../src/Modules/Tron/Polling/Workers/ActivationWorker";
import ResourcesWorker from "../src/Modules/Tron/Polling/Workers/ResourcesWorker";
import NotificationWorker from "../src/Modules/Tron/Notification/Workers/NotificationWorker";
import NotificationQueue from "../src/Modules/Tron/Notification/Queues/NorificationQueue";
import NotificationService from "../src/Modules/Tron/Notification/NotificationService";
import BalanceQueue from "../src/Modules/Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "../src/Modules/Tron/Polling/Queues/ResourcesQueue";
import CryptoServiceFactory from "../src/Modules/CryptoServiceFactory";
import ActivationQueue from "../src/Modules/Tron/Polling/Queues/ActivationQueue";

const balance_queue = new BalanceQueue();
const resource_queue = new ResourcesQueue();
const activation_queue = new ActivationQueue();
const notification_queue = new NotificationQueue();
const notificationService = new NotificationService();
const cryptoServiceFactory = new CryptoServiceFactory(
	balance_queue,
	resource_queue,
	activation_queue,
);
const balanceWorker = new BalanceWorker(
	balance_queue,
	notification_queue,
	cryptoServiceFactory,
	notificationService,
);
const resourceWorker = new ResourcesWorker(
	notificationService,
	cryptoServiceFactory,
);

const notificationWorker = new NotificationWorker();

const activationWorker = new ActivationWorker(cryptoServiceFactory);

process.on("SIGTERM", async () => {
	await notificationWorker.shutdown();
	await balanceWorker.shutdown();
	await resourceWorker.shutdown();
	await activationWorker.shutdown();
	process.exit(0);
});

process.on("SIGINT", async () => {
	await notificationWorker.shutdown();
	await balanceWorker.shutdown();
	await resourceWorker.shutdown();
	await activationWorker.shutdown();
	process.exit(0);
});
