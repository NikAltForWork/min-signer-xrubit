const Redis = require('ioredis');
const { Queue, Worker, Job } = require('bullmq/dist/cjs/index.js');
const client = require('../../Core/Client.js');
const CryptoServiceFactory = require('../CryptoServiceFactory.js');
require('dotenv').config();

class PollingService
{
    constructor() {
        this.factory = new CryptoServiceFactory;
        this.interval = Number(process.env.POLLING_INTERVAL) || 5000;
        this.attempts = Number(process.env.POLLING_MAX_AMOUNT) || 30;
        this.connection = new Redis({
            port: process.env.REDIS_PORT,
            host: process.env.REDIS_HOST,
            maxRetriesPerRequest: null,
        });
        this.queue = new Queue('polling', { connection: this.connection, defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: 100,
        }});
        this.worker = new Worker('polling', (job) => {
            this.pollJob(job.data);
        }, { connection: this.connection });
    }

    async pollJob(data){
        const network = data.network;
        const currency = data.currency;
        const type = data.type;
        const wallet = data.wallet;
        const targetAmount = data.targetAmount;
        const attempts = data.attempts;

        const service = await this.factory.createCryptoService(network, currency, type);
        if(currency === 'USDTTRC20') {
            var balance = await service.getBalanceTR(wallet);
        } else {
            var balance = await service.getBalance(wallet);
        }
        console.log(`polling attempt: ${attempts}, balance: ${balance}, wallet: ${wallet}`);


        if (balance >= targetAmount) {
            await this.sendNotifictation({
                wallet: wallet,
                balance: balance,
            });
            return [];
        }
        //fastify ограничивает возможность использовать throw, потому проверка на колличество попыток ручная
        if (attempts <= Number(process.env.POLLING_MAX_AMOUNT)) {
            await this.queue.add('polling', {
                network: network,
                currency: currency,
                type: type,
                wallet: wallet,
                targetAmount: targetAmount,
                attempts: attempts + 1,
            }, { delay: this.interval });
        }
        return;
    }

    async processWallet(network, currency, type, wallet, targetAmount) {

        const data = await JSON.stringify(wallet);
        const ttl = process.env.KEY_TTL;
        await this.connection.set(`wallet:${wallet.address.base58}`, data, 'EX', ttl, 'NX');

        await this.queue.add('polling', {
            network: network,
            currency: currency,
            type: type,
            wallet: wallet.address.base58,
            targetAmount: targetAmount,
            attempts: 1,
        }, { delay: this.interval });

    }

    async sendNotifictation(data)
    {
      try {
        const response = await client.post('/webhook' ,{
            success: true,
            data: data
        });
        return response.body;
        }
        catch(error) {
            console.log(error.message);
        }
    }
}
module.exports = PollingService;
