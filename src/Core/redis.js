import Redis from 'ioredis';
import config from './config/config.js';

let redisInstanse = null;

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

