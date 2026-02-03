import CryptoServiceFactory from "../../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import ActivationQueue from "../Queues/ActivationQueue";
import BalanceQueue from "../Queues/BalanceQueue";
import ResourcesQueue from "../Queues/ResourcesQueue";
import ResourcesWorker from "../Workers/ResourcesWorker";

const notificationService = new NotificationService();
const balance_queue = new BalanceQueue();
const resource_queue = new ResourcesQueue();
const activation_queue = new ActivationQueue();
const cryptoServiceFactory = new CryptoServiceFactory(
	balance_queue,
	resource_queue,
	activation_queue,
);

const resourceWorker = new ResourcesWorker(
	notificationService,
	cryptoServiceFactory,
);

console.log("Resources worker starter");

process.on("SIGTERM", async () => {
	await resourceWorker.shutdown();
	process.exit(0);
});

process.on("SIGINT", async () => {
	await resourceWorker.shutdown();
	process.exit(0);
});
