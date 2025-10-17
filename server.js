import Fastify from "fastify";
import KeyService from "./src/keys.js";
import TronUSDTService from "./src/tron.js";

const fastify = new Fastify({
  logger: true
})
const key = new KeyService();

fastify.get('/', async function handle(request, reply) {
  return {
    status: 'online' 
  }
})

fastify.post('/keys/:network/:currency/:type', async function handle(request, reply) {
  const { network, currency, type } = request.params;
  const data = {
    xpub: request.body.xpub,
    mnemonic: request.body.mnemonic
  }
  const response = await key.store(network, currency, type, data.xpub, data.mnemonic);
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
    
    return { data: id.txId };
    
  } catch (error) {
    console.error('Transaction error:', error);
    return reply.status(500).send({
      success: false,
      error: error.message
    });
  }
});

fastify.get('/balance/:network/:currency/:type', async function handle(request, reply) {

});

async function createCryptoService(network, currency, type) {
  const serviceKey = `${network}:${currency}`.toLowerCase();
  
  switch(serviceKey) {
    case 'tron:usdt':
      const mnemonic = await key.getKey(network, currency, type);
      console.log('Retrieved mnemonic:', mnemonic);
      return new TronUSDTService(mnemonic);
    default:
      throw new Error(`Unsupported network/currency: ${network}/${currency}`);
  }
}

try {
  await fastify.listen({port: 3000})
} catch (error) {
  console.log(error)
  process.exit(1);
}
