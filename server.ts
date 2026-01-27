import Fastify, {
	type FastifyInstance,
	type FastifyRequest,
	type FastifyReply,
} from "fastify";
import * as crypto from "node:crypto";
import { storeKeys, storeTransaction, getBalance } from "./src/Core/schemas";
import config from "./src/Core/config/config";
import client from "./src/Core/client";
import { loggerOptions } from "./src/Core/logger";
import { getRedis } from "./src/Core/redis";
import NotificationService from "./src/Modules/Tron/Notification/NotificationService";
import KeyService from "./src/Modules/Keys/KeyService";
import NotificationQueue from "./src/Modules/Tron/Notification/Queues/NorificationQueue";
import BalanceQueue from "./src/Modules/Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "./src/Modules/Tron/Polling/Queues/ResourcesQueue";
import CryptoServiceFactory from "./src/Modules/Tron/CryptoServiceFactory";
import ActivationQueue from "./src/Modules/Tron/Polling/Queues/ActivationQueue";

interface RouteParams {
	network: string;
	currency: string;
	type: string;
	error?: any;
}

interface StoreKeysBody {
	privateKey: string;
	mnemonic?: string;
	error?: any;
}

interface TransactionBody {
	id: string;
	address: string;
	amount: string;
	error?: any;
    callback: string;
}

interface BalanceBody {
	address: string;
	error?: any;
}

interface OneTimeAccountBody {
    callback: string;
	amount: number;
	error?: any;
}

interface RestartPolingBody {
    callback: string;
	wallet: string;
	amount: number;
	error?: any;
}

interface DebugUsdtBody {
	address?: string;
	wallet?: string;
	balance?: string | number;
	txId?: string;
	error?: any;
}
interface FinishTransactionBody {
    callback: string;
	id: string;
	address: string;
	balance: string;
	error?: any;
}

interface CreateAccountResponse {
	success: boolean;
	data?: any;
	error?: any;
}

interface KeyStoredResponse {
	success: boolean;
	data: boolean | null;
	error?: any;
}

export interface PingResponse {
	success: boolean;
	service: string;
	status: "online";
	timeStamp: string;
	uptime: number;
	memory: {
		rss: number;
		heapTotal: number;
		heapUsed: number;
		external: number;
		arrayBuffers: number;
	};
	nodeVersion: string;
}

interface BasicResponse {
	success: boolean;
	error?: string;
	status?: string;
	data?: any;
}

const keyService = new KeyService();
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
const fastify: FastifyInstance = Fastify({
	logger: loggerOptions,
});

// Middleware для проверки подписи
fastify.addHook(
	"preHandler",
	async (
		request: FastifyRequest<{
			Body?: any;
			Params?: RouteParams;
			Querystring?: any;
			Headers?: {
                "x-request-id"?: string;
				"x-timestamp"?: string;
				"x-signature"?: string;
			};
		}>,
		reply: FastifyReply,
	) => {
		if (request.routeOptions.url === "/ping") {
			return;
		}

		const isEnabled = Number.parseInt(config.client.securityEnabled);

		if (isEnabled === 0) {
			return;
		}

        const request_id = request.headers['x-request-id'];
		const timestamp = request.headers["x-timestamp"];
		const signature = request.headers["x-signature"];
		const secret = config.client.secret;

        if(!request_id) {
            return reply.code(422).send({error: "Missing request id"});
        }

        const connection = getRedis();

        const ri = await connection.get(`request:${request_id}`);

        if (ri)  return reply.code(409).send({error: "This request already in processing"});

        await connection.set(`request:${request_id}`, request_id, 'EX', 20);

		if (!timestamp || !signature) {
			return reply.code(401).send({ error: "Missing auth headers" });
		}

		const payload = JSON.stringify(request.body || {});
		const expected = crypto
			.createHmac("sha256", secret)
			.update(timestamp + payload)
			.digest("hex");

		if (expected !== signature) {
			return reply.code(401).send({ error: "Invalid signature" });
		}
	},
);

fastify.get(
	"/ping",
	async (
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<PingResponse> => ({
		success: true,
		service: "signer-api",
		status: "online",
		timeStamp: new Date().toISOString(),
		uptime: process.uptime(),
		memory: process.memoryUsage(),
		nodeVersion: process.version,
	}),
);

// Получение аккаунта
fastify.get<{
	Params: RouteParams;
}>(
	"/accounts/:network/:currency/:type",
	async (
		request: FastifyRequest<{ Params: RouteParams }>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { network, currency, type } = request.params;
			const service = await cryptoServiceFactory.createCryptoService(
				network,
				currency,
				type,
			);
			const account = await service.createAccount();

			return {
				success: true,
				data: account,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
			};
		}
	},
);

// Создание одноразового аккаунта
fastify.post<{
	Params: RouteParams;
	Body: OneTimeAccountBody;
}>(
	"/accounts/onetime/:network/:currency/:type",
	async (
		request: FastifyRequest<{ Params: RouteParams; Body: OneTimeAccountBody }>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { network, currency, type } = request.params;
			const service = await cryptoServiceFactory.createCryptoService(
				network,
				currency,
				type,
			);
			const wallet = await service.createAccount();

			const connection = getRedis();
			const data = JSON.stringify(wallet);
			const ttl = config.polling.keyTtl;
			await connection.set(
				`wallet:${wallet.address.base58}`,
				data,
				"EX",
				ttl,
				"NX",
			);

			balance_queue.addJob({
				network: network,
				currency: currency,
				type: type,
				wallet: wallet.address.base58,
				targetAmount: request.body.amount,
				attempts: 1,
				contract: service.getContract(),
                callback: request.body.callback,
			});

			return {
				success: true,
				data: wallet,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
			};
		}
	},
);

// Сохранение ключей (зашифрованных)
fastify.post<{
	Params: RouteParams;
	Body: StoreKeysBody;
}>(
	"/keys/:network/:currency/:type",
	{ schema: storeKeys },
	async (
		request: FastifyRequest<{ Params: RouteParams; Body: StoreKeysBody }>,
		reply: FastifyReply,
	): Promise<BasicResponse> => {
		try {
			const { network, currency, type } = request.params;
			const response = await keyService.storeEncrypt(
				network,
				currency,
				type,
				request.body.privateKey,
				String(request.body.mnemonic),
			);

			reply.code(201);
			return {
				success: response.success,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
			};
		}
	},
);

// Сохранение ключей (небезопасное)
fastify.post<{
	Params: RouteParams;
	Body: StoreKeysBody;
}>(
	"/keys/unsafe/:network/:currency/:type",
	{ schema: storeKeys },
	async (
		request: FastifyRequest<{ Params: RouteParams; Body: StoreKeysBody }>,
		reply: FastifyReply,
	): Promise<BasicResponse> => {
		try {
			const { network, currency, type } = request.params;
			const response = await keyService.store(
				network,
				currency,
				type,
				request.body.privateKey,
				String(request.body.mnemonic),
			);

			reply.code(201);
			return {
				success: response.success,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
			};
		}
	},
);

// Получение адреса аккаунта
fastify.get<{
	Params: RouteParams;
}>(
	"/keys/address/:network/:currency/:type",
	async (
		request: FastifyRequest<{ Params: RouteParams }>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { network, currency, type } = request.params;
			const service = await cryptoServiceFactory.createCryptoService(
				network,
				currency,
				type,
			);
			const response = await service.getAccount();

			return {
				success: true,
				data: response,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: null,
			};
		}
	},
);

// Проверка сохраненных ключей
fastify.get<{
	Params: RouteParams;
}>(
	"/keys/stored/:network/:currency/:type",
	async (
		request: FastifyRequest<{ Params: RouteParams }>,
		reply: FastifyReply,
	): Promise<KeyStoredResponse> => {
		try {
			const { network, currency, type } = request.params;
			const response = await keyService.isStored(network, currency, type);

			return {
				success: true,
				data: Boolean(response),
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
				data: null,
			};
		}
	},
);

// Создание транзакции
fastify.post<{
	Params: RouteParams;
	Body: TransactionBody;
}>(
	"/transactions/:network/:currency/:type",
	{ schema: storeTransaction },
	async (
		request: FastifyRequest<{ Params: RouteParams; Body: TransactionBody }>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { network, currency, type } = request.params;
			const { address, amount, id, callback } = request.body;

			if (!address || !amount) {
				reply.code(400);
				return {
					success: false,
					error: "Missing address or amount",
				};
			}

			const service = await cryptoServiceFactory.createCryptoService(
				network,
				currency,
				type,
			);
			const result = await service.createAndSignTransfer({
				network: network,
				currency: currency,
				type: type,
				to: address,
				amount: amount,
				id: id,
                callback: callback,
			});

			return {
				success: true,
				data: result,
			};
		} catch (error: any) {
			request.log.error("Transaction error:", error);
			reply.code(500);
			return {
				success: false,
				error: error,
			};
		}
	},
);

// Завершение транзакции
fastify.post<{
	Params: RouteParams;
	Body: FinishTransactionBody;
}>(
	"/transactions/finish/:network/:currency/:type",
	async (
		request: FastifyRequest<{
			Params: RouteParams;
			Body: FinishTransactionBody;
		}>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { address, balance, id, callback } = request.body;
			const { network, currency, type } = request.params;

			const service = await cryptoServiceFactory.createCryptoService(
				network,
				currency,
				type,
			);
			const response = await service.finishTransaction({
				network: network,
				currency: currency,
				type: type,
				address: address,
				balance: balance,
				id: id,
                callback: callback,
            });

			return {
				success: true,
				data: response,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
			};
		}
	},
);

// Получение баланса
fastify.post<{
	Params: RouteParams;
	Body: BalanceBody;
}>(
	"/balance/:network/:currency/:type",
	{ schema: getBalance },
	async (
		request: FastifyRequest<{ Params: RouteParams; Body: BalanceBody }>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { address } = request.body;
			const { network, currency, type } = request.params;

			const service = await cryptoServiceFactory.createCryptoService(
				network,
				currency,
				type,
			);
			const result = await service.getBalance(address);

			return {
				success: true,
				data: result,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
			};
		}
	},
);

// Отладочный endpoint для получения ID транзакции USDT
fastify.post<{
	Body: DebugUsdtBody;
}>(
	"/debug/usdt/txId",
	async (
		request: FastifyRequest<{ Body: DebugUsdtBody }>,
		reply: FastifyReply,
	): Promise<BasicResponse> => {
		try {
			const { address } = request.body;

			if (!address) {
				reply.code(400);
				return {
					success: false,
					error: "Missing address",
				};
			}

			const url = `https://api.shasta.trongrid.io/v1/accounts/${address}/transactions/trc20?contract_address=${config.tron.usdt_contract}&only_confirmed=true&limit=200`;
			const res = await fetch(url);
			const resData = await res.json();

			if (resData.data && resData.data[0]?.transaction_id) {
				return {
					success: true,
					data: {
						txId: resData.data[0].transaction_id,
					},
				};
			}

			return {
				success: false,
				error: "Transaction not found",
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
			};
		}
	},
);

// Отладочный endpoint для уведомления о платеже
fastify.post<{
	Body: DebugUsdtBody;
}>(
	"/debug/usdt/notify",
	async (
		request: FastifyRequest<{ Body: DebugUsdtBody }>,
		reply: FastifyReply,
	): Promise<BasicResponse> => {
		try {
			const { wallet, balance, txId } = request.body;

			if (!wallet || balance === undefined || !txId) {
				reply.code(400);
				return {
					success: false,
					error: "Missing required fields",
				};
			}

			const body = JSON.stringify({
				wallet,
				balance,
				txId,
			});

			const signature = crypto
				.createHmac("sha256", config.client.secret)
				.update(body)
				.digest("hex");

			const response = await client.post(
				"/api/transactions/webhook/payments",
				body,
				{
					headers: {
						"Content-Type": "application/json",
						"X-Signature": signature,
					},
				},
			);

			return {
				success: true,
				data: response.data,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
				error: error.message,
			};
		}
	},
);
// Запустить полинг заново
fastify.post<{
	Params: RouteParams;
	Body: RestartPolingBody;
}>(
	"/accounts/debug/polling/:network/:currency/:type",
	async (
		request: FastifyRequest<{ Params: RouteParams; Body: RestartPolingBody }>,
		reply: FastifyReply,
	): Promise<CreateAccountResponse> => {
		try {
			const { network, currency, type } = request.params;
			const { wallet, amount, callback } = request.body;

			balance_queue.addJob({
				network: network,
				currency: currency,
				type: type,
				wallet: wallet,
				targetAmount: amount,
				attempts: 1,
                callback: callback,
			});

			return {
				success: true,
				data: wallet,
			};
		} catch (error: any) {
			reply.code(500);
			return {
				success: false,
			};
		}
	},
);

// Запуск сервера
async function startServer(): Promise<void> {
	try {
		await fastify.listen({
			port: 3000,
			host: "0.0.0.0",
		});
		console.log("Server started successfully on port 3000");
	} catch (error) {
		console.error("Server startup error:", error);

		console.log("Restarting server in 5 seconds...");
		setTimeout(startServer, 5000);
	}
}

// Запуск приложения
startServer().catch(console.error);

export default fastify;
