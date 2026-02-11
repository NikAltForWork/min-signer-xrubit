import { container } from "../../../../Core/container/container";
import CryptoServiceFactory from "../../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import NotificationQueue from "../../Notification/Queues/NorificationQueue";
import BalanceQueue from "../Queues/BalanceQueue";
import BalanceWorker from "../Workers/BalanceWorker";
//import ActivationQueue from "../Queues/ActivationQueue";
//import ResourcesQueue from "../Queues/ResourcesQueue";

const notificationService = container.resolve<NotificationService>(
	"notificationService",
);
const balance_queue = container.resolve<BalanceQueue>("balance_queue");
const notification_queue =
	container.resolve<NotificationQueue>("notification_queue");
const cryptoServiceFactory = container.resolve<CryptoServiceFactory>(
	"cryptoServiceFactory",
);
//const activation_queue = container.resolve<ActivationQueue>("activation_queue");
//const resource_queue = container.resolve<ResourcesQueue>("resource_queue");

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

process.on("SIGINT", async () => {
	await balanceWorker.shutdown();
	process.exit(0);
});
