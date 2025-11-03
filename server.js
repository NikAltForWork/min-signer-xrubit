const Fastify = require("fastify");
const CryptoServiceFactory = require('./src/Services/CryptoServiceFactory.js');
const KeyService = require("./src/Services/keys.js");
const PollingService = require('./src/Services/Polling/PollingService.js');
const { storeKeys, storeTransaction, getBalance } = require('./src/Core/Schemas.js');
const key = new KeyService();

const factory = new CryptoServiceFactory();
const polling = new PollingService();
const fastify = new Fastify({
  logger: true
})

fastify.get('/ping', async function handle(request, reply) {
    reply.send({
        success: true,
        status: 'online',
    });
})

fastify.get('/accounts/:network/:currency/:type', async function handle(request, reply) {
  try {
  const { network, currency, type } = request.params;
  const service = await factory.createCryptoService(network, currency, type);
  const account = await service.createAccount();
  reply.send({
        success: true,
        data: account,
    });
    } catch(error) {
    reply.code(500).send({
        success: false,
        error: error.message,
    });
    }
});

fastify.post('/accounts/onetime/:network/:currency/:type', async function handle(request, reply) {
    try {
    const { network, currency, type } = request.params;
    const service = await factory.createCryptoService(network, currency, type);
    const wallet = await service.createAccount();
    polling.processWallet(network, currency, type, wallet, request.body.amount);

    reply.send({
        success: true,
        data: wallet,
    })
    } catch(error) {
    reply.code(500).send({
        success: false,
        error: error.message,
    });
    }
});

fastify.post('/keys/:network/:currency/:type', { schema: storeKeys } ,async function handle(request, reply) {
 try {
  const { network, currency, type } = request.params;
  const data = {
    privateKey: request.body.privateKey,
    mnemonic: request.body.mnemonic
  }
  const response = await key.storeEncrypt(network, currency, type, data.privateKey, data.mnemonic);
  reply.code(201);
  reply.send({
        success: response.success,
    });
    } catch (error) {
    reply.code(500).send({
        success: false,
        error: error.message,
    });
    }
});

fastify.post('/keys/unsafe/:network/:currency/:type', { schema: storeKeys }, async function handle(request, reply) {
 try {
  const { network, currency, type } = request.params;
  const data = {
    privateKey: request.body.privateKey,
    mnemonic: request.body.mnemonic
  }
  const response = await key.store(network, currency, type, data.xpub, data.mnemonic);
  reply.code(201);
  reply.send({
        success: response.success,
    });
    } catch(error) {
    reply.status(500).send({
        success: false,
        error: error.message
    });
    }
});

fastify.get('/keys/address/:network/:currency/:type', async function handle(request, reply) {
 try {
  const { network, currency, type } = request.params;
  const service = await factory.createCryptoService(network, currency, type);
  const response = await service.getAccount();
    reply.send({
        success: true,
        data: response
    });
  } catch(error) {
    reply.status(500).send({
        success: false,
        error: error.message,
    });
  }
});

fastify.get('/keys/stored/:network/:currency/:type', async function handle(request, reply) {
 try {
  const { network, currency, type } = request.params;
  const response = await key.isStored(network, currency, type);
    reply.send({
        success: true,
        data: response,
    });
    } catch(error) {
    reply.status(500).send({
        success: false,
        error: error.message,
      });
    }

});

fastify.post('/transactions/:network/:currency/:type', { schema: storeTransaction }, async function handle(request, reply) {
  try {
    const { network, currency, type } = request.params;
    const { address, amount } = request.body;
    if (!address || !amount) {
        return reply.code(400).send({
            success: false,
            error: 'Missing address or amount',
        });
    }
    request.log.info('Creating transaction:', { network, currency, type, address, amount });

    const service = await factory.createCryptoService(network, currency, type);
    const result = await service.createAndSignTransfer({
      to: address,
      amount: amount.toString(),
    });
    reply.send({
        success: true,
        data: result
    });

  } catch (error) {
    console.error('Transaction error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message
    });
  }
});

fastify.post('/transactions/finish/:network/:currency/:type', async function handle(request, reply) {
    try {
        const { address, balance } = request.body;
        const { network, currency, type } = request.params;
        const service = await factory.createCryptoService(network, currency, type);
        const response = await service.finaliseTransaction(address, balance);
        reply.send({
            success: true,
            data: response,
        });
    } catch(error) {
        reply.status(500).send({
            success: false,
            error: error.message,
        });
    }
});

fastify.post('/balance/:network/:currency/:type', { schema: getBalance }, async function handle(request, reply) {
    try {
        const { address } = request.body;
        const { network, currency, type } = request.params;
        const service = await factory.createCryptoService(network, currency, type);
        const result = await service.getBalance(address);
        reply.send({
            success: true,
            data: result,
        });
    } catch(error) {
        return reply.status(500).send({
            success: false,
            error: error.message
        });
    }
});

async function startServer() {
  try {
    await fastify.listen({
      port: 3000,
      host: '0.0.0.0'
    });
    console.log('Server started successfully on port 3000');
  } catch (error) {
    console.error('Server startup error:', error);

    console.log('Restarting server in 5 seconds...');
    setTimeout(startServer, 5000);
  }
}

startServer();

