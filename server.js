const Fastify = require("fastify");
const  KeyService = require("./src/Services/keys.js");
const USDTService = require("./src/Services/Tron/USDTService.js");
const TronService = require("./src/Services/Tron/TronService.js");
const EtheriumService = require("./src/Services/Ether/EtheriumService.js");
const fastify = new Fastify({
  logger: true
})
const key = new KeyService();

fastify.get('/ping', async function handle(request, reply) {
    reply.send({
        success: true,
        status: 'online',
    });
})

fastify.get('/accounts/:network/:currency/:type', async function handle(request, reply) {
  const { network, currency, type } = request.params;
  const service = await createCryptoService(network, currency, type);
  const account = await service.createAccount();
  reply.send({
        success: true,
        data: account,
    });
})

fastify.get('/accounts/throwaway/:network/:currency/:type', async function handle(request, reply) {

});

fastify.post('/keys/:network/:currency/:type', async function handle(request, reply) {
  const { network, currency, type } = request.params;
  const data = {
    xpub: request.body.xpub,
    mnemonic: request.body.mnemonic
  }
  const response = await key.storeEncrypt(network, currency, type, data.xpub, data.mnemonic);
  reply.code(response.code);
  reply.send({
        success: response.success,
        error: response.error,
    });
});

fastify.post('/keys/unsafe/:network/:currency/:type', async function handle(request, reply) {
  const { network, currency, type } = request.params;
  const data = {
    xpub: request.body.xpub,
    mnemonic: request.body.mnemonic
  }
  const response = await key.store(network, currency, type, data.xpub, data.mnemonic);
  reply.code(response.code);
  reply.send({
        success: response.success,
        error: response.error,
    });
});

fastify.get('/keys/address/:network/:currency/:type', async function handle(request, reply) {
  const { network, currency, type } = request.params;
  const service = await createCryptoService(network, currency, type);
  const response = await service.getAccount();
  return { address: response.address };
});

fastify.get('/keys/stored/:network/:currency/:type', async function handle(request, reply) {
  const { network, currency, type } = request.params;
  const response = await key.isStored(network, currency, type);
  return response;
});

fastify.post('/transactions/:network/:currency/:type', async function handle(request, reply) {
  try {
    const { network, currency, type } = request.params;
    const { address, amount } = request.body;

    console.log('Creating transaction:', { network, currency, type, address, amount });

    const service = await createCryptoService(network, currency, type);
    const result = await service.createAndSignTransfer({
      to: address,
      amount: amount.toString(),
      accountIndex: 0
    });

    return { data: result };

  } catch (error) {
    console.error('Transaction error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message
    });
  }
});

fastify.post('/balance/:network/:currency/:type', async function handle(request, reply) {
    try {
        const { address } = request.body;
        const { network, currency, type } = request.params;
        const service = await createCryptoService(network, currency, type);
        const result = await service.getBalance(address);
        return result;
    } catch(error) {
        return reply.status(500).send({
            success: false,
            error: error.message
        });
    }
});

async function createCryptoService(network, currency, type) {
  const serviceKey = `${network}:${currency}`.toLowerCase();

  switch(serviceKey) {
    case 'trc20:usdttrc20':
      var mnemonic = await key.decryptKey(network, currency, type);
      return new USDTService(mnemonic);
    case 'trc20:tron':
      var mnemonic = await key.decryptKey(network, currency, type);
      return new TronService(mnemonic);
    case 'ether:etherium':
      var mnemonic = await key.decryptKey(network, currency, type);
      return new EtheriumService(mnemonic);
    default:
      throw new Error(`Unsupported network/currency: ${network}/${currency}`);
  }
}

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
