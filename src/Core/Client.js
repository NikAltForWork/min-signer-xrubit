const Axios = require('axios');
require('dotenv').config()

const client = Axios.create({
    baseURL: process.env.CORE_ADDRESS,
    timeout: 3000,
    headers: {
        "Content-Type" : "application/json",
    },
});

module.exports = client;

