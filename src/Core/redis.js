const Redis = require('ioredis');
require('dotenv').config();

let redisInstanse = null;

function getRedis() {
    if (!redisInstanse) {
        redisInstanse = new Redis({
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            maxRetriesPerRequest: null,
        });
    }
    return redisInstanse;
}
module.exports = getRedis;
