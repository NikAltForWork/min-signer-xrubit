import Axios from "axios";
import type { AxiosInstance } from "axios";

const client: AxiosInstance = Axios.create({
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
		Accept: "application/json",
	},
});

export default client;
