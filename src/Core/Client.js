const Axios = require('axios');
const config = require('./config/config')

const client = Axios.create({
    baseURL: config.client.baseURL,
    timeout: 30000,
    headers: {
        "Content-Type" : "application/json",
    },
});

module.exports = client;

