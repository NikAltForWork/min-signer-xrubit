import dotenv from 'dotenv';
dotenv.config();

const config = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0'
    },
    redis: {
        host: process.env.REDIS_HOST || 'http://app-redis',
        port: process.env.REDIS_PORT || '6379',
        password: process.env.REDIS_PASSWORD
    },
    polling: {
        interval: process.env.POLLING_INTERVAL || 30000,
        maxAttempts: process.env.POLLING_MAX_AMOUNT || 30,
        keyTtl: process.env.KEY_TTL || 3600
    },
    keys: {
        appKey: process.env.APP_KEY || '12345678123456781234567812345678',
        algorithm: process.env.ALGORITHM || 'aes-256-gcm',
        iv_length: process.env.IV_LENGTH || 16,
    },
    client: {
        baseURL: process.env.CLIENT_ADDRESS || 'http://app-nginx:80',
        secret: process.env.SIGNER_SECRET || '9285dasij1129210jasjdapd902j20dpasnnf392ISAaind229',
    },
    tron: {
        network: process.env.TRON_NETWORK || 'https://api.shasta.trongrid.io',
        key: process.env.TRON_KEY,
        usdt_contract: process.env.USDT_CONTRACT_ADDRESS,
        usdc_contract: process.env.USDC_CONTRACT_ADDRESS,
    }

}

export default config;
