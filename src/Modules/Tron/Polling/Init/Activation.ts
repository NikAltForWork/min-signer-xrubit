import ActivationWorker from "../Workers/ActivationWorker";
import CryptoServiceFactory from "../../CryptoServiceFactory";
import BalanceQueue from "../Queues/BalanceQueue";
import ResourcesQueue from "../Queues/ResourcesQueue";

const balance_queue = new BalanceQueue();
const resource_queue = new ResourcesQueue();
const cryptoServiceFactory = new CryptoServiceFactory(
	balance_queue,
	resource_queue,
);

const worker = new ActivationWorker(cryptoServiceFactory);

console.log("Activation worker started");

process.on("SIGTERM", async() => {
    await worker.shutdown();
    process.exit(0);
})

process.on('SIGINT', async () => {
    await worker.shutdown();
    process.exit(0);
})

