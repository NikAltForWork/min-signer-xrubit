import ActivationWorker from "../Workers/ActivationWorker";
import CryptoServiceFactory from "../../../CryptoServiceFactory";
import BalanceQueue from "../Queues/BalanceQueue";
import ResourcesQueue from "../Queues/ResourcesQueue";
import ActivationQueue from "../Queues/ActivationQueue";

const balance_queue = new BalanceQueue();
const resource_queue = new ResourcesQueue();
const activation_queue = new ActivationQueue();
const cryptoServiceFactory = new CryptoServiceFactory(
	balance_queue,
	resource_queue,
	activation_queue,
);

const worker = new ActivationWorker(cryptoServiceFactory);

console.log("Activation worker started");

process.on("SIGTERM", async () => {
	await worker.shutdown();
	process.exit(0);
});

process.on("SIGINT", async () => {
	await worker.shutdown();
	process.exit(0);
});
