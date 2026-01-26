import CryptoServiceFactory from "../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import NotificationQueue from "../../Notification/Queues/NorificationQueue";
import ActivationQueue from "../Queues/ActivationQueue";
import BalanceQueue from "../Queues/BalanceQueue";
import ResourcesQueue from "../Queues/ResourcesQueue";
import BalanceWorker from "../Workers/BalanceWorker";

const notificationService = new NotificationService();
const balance_queue = new BalanceQueue();
const resource_queue = new ResourcesQueue();
const notification_queue = new NotificationQueue();
const activation_queue = new ActivationQueue();
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

console.log("Balance Worker started");

process.on("SIGTERM", async () => {
    await balanceWorker.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await balanceWorker.shutdown();
    process.exit(0);
});

