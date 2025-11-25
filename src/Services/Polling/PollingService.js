import { Queue, Worker } from 'bullmq';
import client from '../../Core/Client.js';
import { getRedis } from '../../Core/redis.js';
import CryptoServiceFactory from '../CryptoServiceFactory.js';
import config from '../../Core/config/config.js';

export default class PollingService
{
    constructor() {
        this.factory = new CryptoServiceFactory;
        this.interval = Number(config.polling.interval);
        this.attempts = Number(config.polling.maxAttempts);
        this.connection = getRedis();
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
        if(currency === 'USDTTRC20') { //Временное решение, пока не разберусь с другими валютами
            var balance = Number(await service.getBalanceTR(wallet));
        } else {
            var balance = Number(await service.getBalance(wallet));
        }
        console.log(`polling attempt: ${attempts}, balance: ${balance}, targetAmount: ${targetAmount}, wallet: ${wallet}`);

        if (balance >= targetAmount) {
            console.log(`polling attempt ${attempts} succeded, balance: ${balance}`);
            await this.sendNotification({
                wallet: wallet,
                balance: balance,
            });
            return [];
        }
        //fastify ограничивает возможность использовать throw, потому проверка на колличество попыток ручная
        if (attempts <= Number(config.polling.maxAttempts)) {
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
        console.log(data);
        const ttl = config.polling.keyTtl;
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

    async sendNotification(data)
    {
      try {
        const response = await client.post('/api/transactions/webhook/payments', data);
        return response.body;
        }
        catch(error) {
            console.log(error.code);
            console.log(error.message);
        }
    }
}
