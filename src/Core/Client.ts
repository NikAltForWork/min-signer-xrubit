import Axios from "axios";
import type { AxiosInstance } from "axios";
import config from "./config/config";

const client: AxiosInstance = Axios.create({
	baseURL: config.client.baseURL,
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

export default client;
