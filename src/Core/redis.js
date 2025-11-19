const Redis = require('ioredis');
const config = require('./config/config');

let redisInstanse = null;

function getRedis() {
    if (!redisInstanse) {
        redisInstanse = new Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            maxRetriesPerRequest: null,
        });
    }
    return redisInstanse;
}
module.exports = getRedis;
