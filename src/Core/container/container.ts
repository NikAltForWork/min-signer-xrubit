import {
	createContainer,
	InjectionMode,
	asClass,
	asFunction,
	Lifetime,
} from "awilix";

import { getRedis } from "../redis/redis";
import TronBasicService from "../basicServices/TronBasicService";
import TronService from "../../Modules/Tron/Services/TronService";
import USDTService from "../../Modules/Tron/Services/USDTService";
import ReFeeService from "../../Modules/Tron/Services/ReFeeService";
import ActivationQueue from "../../Modules/Tron/Polling/Queues/ActivationQueue";
import BalanceQueue from "../../Modules/Tron/Polling/Queues/BalanceQueue";
import ResourcesQueue from "../../Modules/Tron/Polling/Queues/ResourcesQueue";
import NotificationQueue from "../../Modules/Tron/Notification/Queues/NorificationQueue";
import NotificationService from "../../Modules/Tron/Notification/NotificationService";
import KeyService from "../../Modules/Keys/KeyService";
import TransactionServiceFactory from "../../Modules/TransactionServiceFactory";
import CryptoServiceFactory from "../../Modules/CryptoServiceFactory";
import TronTransactionService from "../../Modules/Tron/Services/TronTransactionService";

export const container = createContainer({
	injectionMode: InjectionMode.PROXY,
	strict: true,
});

container.register({
	redis: asFunction(getRedis, {
		lifetime: Lifetime.SINGLETON,
	}),
	activation_queue: asClass(ActivationQueue, {
		lifetime: Lifetime.SINGLETON,
	}),
	balance_queue: asClass(BalanceQueue, {
		lifetime: Lifetime.SINGLETON,
	}),
	resources_queue: asClass(ResourcesQueue, {
		lifetime: Lifetime.SINGLETON,
	}),
	notification_queue: asClass(NotificationQueue, {
		lifetime: Lifetime.SINGLETON,
	}),

	notificationService: asClass(NotificationService, {
		lifetime: Lifetime.SINGLETON,
	}),

	keyService: asClass(KeyService),

	tronBasicService: asClass(TronBasicService),
	tronService: asClass(TronService),
	usdtService: asClass(USDTService),
	reFeeService: asClass(ReFeeService, {
		lifetime: Lifetime.SINGLETON,
	}),

	transactionServiceFactory: asClass(TransactionServiceFactory),
	cryptoServiceFactory: asClass(CryptoServiceFactory),

	usdtServiceFactory: asFunction(
		({
			redis,
			reFeeService,
			resources_queue,
			balance_queue,
			activation_queue,
            notification_queue,
			notificationService,
		}) =>
			(privateKey: string) =>
				new USDTService({
					redis,
					reFeeService,
					resources_queue,
					balance_queue,
					activation_queue,
                    notification_queue,
					notificationService,
					privateKey,
				}),
		{ lifetime: Lifetime.SINGLETON },
	),

	tronServiceFactory: asFunction(
		(cradle) => (privateKey: string) =>
			new TronService({
				redis: cradle.redis,
				reFeeService: cradle.reFeeService,
				resources_queue: cradle.resources_queue,
				balance_queue: cradle.balance_queue,
                notification_queue: cradle.notification_queue,
				activation_queue: cradle.activation_queue,
				privateKey,
			}),
		{ lifetime: Lifetime.SINGLETON },
	),

	tronTransactionServiceFactory: asFunction(
		(cradle) => (privateKey: string) =>
			new TronTransactionService({
				resources_queue: cradle.resources_queue,
				balance_queue: cradle.balance_queue,
				activation_queue: cradle.activation_queue,
			}),
		{ lifetime: Lifetime.SINGLETON },
	),
});
