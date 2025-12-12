import Redis from "ioredis";
import type RedisCommander from "ioredis";
import config from "../Core/config/config";

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

