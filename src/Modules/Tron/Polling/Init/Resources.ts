import { container } from "../../../../Core/container/container";
import CryptoServiceFactory from "../../../CryptoServiceFactory";
import NotificationService from "../../Notification/NotificationService";
import ResourcesWorker from "../Workers/ResourcesWorker";
//import ActivationQueue from "../Queues/ActivationQueue";
//import BalanceQueue from "../Queues/BalanceQueue";
//import ResourcesQueue from "../Queues/ResourcesQueue";

const notificationService = container.resolve<NotificationService>(
	"notificationService",
);
const cryptoServiceFactory = container.resolve<CryptoServiceFactory>(
	"cryptoServiceFactory",
);

//const balance_queue = container.resolve<BalanceQueue>("balance_queue");
//const resource_queue = container.resolve<ResourcesQueue>("resource_queue");
//const activation_queue = container.resolve<ActivationQueue>("activation_queue");
//
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
