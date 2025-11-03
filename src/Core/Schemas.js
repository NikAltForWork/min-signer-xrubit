const storeKeys = {
    body: {
        type: 'object',
        properties: {
            privateKey: { type: 'string' },
            mnemonic: { type: 'string' }
        },
        required: ['privateKey'],
    },
    response: {
        201: {
            type: 'object',
            properties: {
                success: true,
            },
        },
    },
};
const storeTransaction = {
    body: {
        type: 'object',
        properties: {
            address: { type: 'string' },
            amount: { type: 'number'},
        },
        required: ['address', 'amount'],
    },
};
const getBalance = {
    body: {
        type: 'object',
        properties: {
            address: { type: 'string' }
        },
        required: ['address'],
    },
};
module.exports = { storeKeys, storeTransaction, getBalance };

