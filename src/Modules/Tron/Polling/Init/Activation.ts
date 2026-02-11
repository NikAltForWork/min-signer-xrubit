import ActivationWorker from "../Workers/ActivationWorker";
import CryptoServiceFactory from "../../../CryptoServiceFactory";
import { container } from "../../../../Core/container/container";

const cryptoServiceFactory = container.resolve<CryptoServiceFactory>(
	"cryptoServiceFactory",
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
