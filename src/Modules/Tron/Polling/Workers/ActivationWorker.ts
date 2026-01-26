import { Worker } from "bullmq";
import axios from "axios";
import { PollingActivationData } from "../Queues/ActivationQueue";
import CryptoServiceFactory from "../../CryptoServiceFactory";
import { getRedis } from "../../../../Core/redis";
import config from "../../../../Core/config/config";


export default class ActivationWorker {
   private worker: Worker<PollingActivationData>
   private factory: CryptoServiceFactory;

   constructor(factory: CryptoServiceFactory) {
        this.worker = new Worker<PollingActivationData>(
            "polling-activation",
            async (job) => {
                await this.checkActivation(job.data);
            },
            {
                connection: getRedis(),
            }
        )
        this.factory = factory;
    }

    private async checkActivation(data: PollingActivationData) {
        const wallet = data.to;
        const network = data.network;
        const currency = data.currency;
        const type = data.type;
        const id = data.id;
        const amount = data.amount;

        const response = await axios.get(`https://api.trongrid.io/v1/accounts/${wallet}`, {
            headers: {
                "Accept": "application/json",
                "TRON-PRO-API-KEY": config.tron.key,
            },
        });

        const isActive = response.data.data.length > 0;

        if(!isActive) {
            throw new Error("WALLET_NOT_ACTIVE");
        }

        const service = await this.factory.createCryptoService(network, currency, type);

        await service.finishActivationControll(network, currency, type, wallet, amount, id);

    }

    public async shutdown() {
        await this.worker.close();
    }


}
