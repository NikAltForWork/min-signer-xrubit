import NotificationWorker from "../Workers/NotificationWorker";

const worker = new NotificationWorker();

console.log("Notification Worker started");

process.on("SIGTERM", async () => {
	await worker.shutdown();
	process.exit(0);
});

process.on("SIGINT", async () => {
	await worker.shutdown();
	process.exit(0);
});
