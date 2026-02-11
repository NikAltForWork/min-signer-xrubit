import Redis from "ioredis";
import type RedisCommander from "ioredis";
import config from "../config/config";

let redisInstanse: RedisCommander;

export function getRedis() {
	if (!redisInstanse) {
		redisInstanse = new Redis({
			host: config.redis.host,
			port: Number(config.redis.port),
			password: config.redis.password,
			maxRetriesPerRequest: null,
		});
	}
	return redisInstanse;
}

export async function closeRedis() {
	try {
		if (redisInstanse) {
			// Attempt a graceful quit first
			await redisInstanse.quit();
			// After quit, clear the instance reference
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
			// @ts-ignore
			redisInstanse = undefined;
		}
	} catch (err) {
		// If quit fails, force disconnect
		try {
			if (redisInstanse && typeof redisInstanse.disconnect === "function") {
				// ioredis disconnects without waiting
				redisInstanse.disconnect();
			}
		} catch (e) {
			// swallow
		}
	}
}
