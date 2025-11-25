import Axios from 'axios';
import config from './config/config.js';

const client = Axios.create({
    baseURL: config.client.baseURL,
    timeout: 30000,
    headers: {
        "Content-Type" : "application/json",
        "Accept": "application/json",
    },
});

export default client;
