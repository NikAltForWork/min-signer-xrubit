import * as dotenv from "dotenv";
dotenv.config();

const config = {
	server: {
		env: process.env.ENV || "local",
		port: process.env.PORT || 3000,
		host: process.env.HOST || "0.0.0.0",
	},
	redis: {
		host: process.env.REDIS_HOST || "http://app-redis",
		port: process.env.REDIS_PORT || "6379",
		password: process.env.REDIS_PASSWORD,
	},
	polling: {
		interval: process.env.POLLING_INTERVAL || "60000",
		maxAttempts: process.env.POLLING_MAX_AMOUNT || "30",
		keyTtl: process.env.KEY_TTL || "3600",
	},
	keys: {
		appKey: process.env.APP_KEY || "12345678123456781234567812345678",
		algorithm: process.env.ALGORITHM || "aes-256-gcm",
		iv_length: process.env.IV_LENGTH || 16,
	},
	client: {
		baseURL: process.env.CLIENT_ADDRESS || "http://app-nginx:80",
		secret:
			process.env.SIGNER_SECRET ||
			"9285dasij1129210jasjdapd902j20dpasnnf392ISAaind229",
		securityEnabled: process.env.SECURITY_ENABLED || "0",
	},
	tron: {
		network: "https://api.shasta.trongrid.io",
		key: process.env.TRON_KEY || "9f865fde-5809-4d5f-80c2-64247a70391d",
		usdt_contract: "TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs", //String(process.env.USDT_CONTRACT_ADDRESS),
		usdc_contract: process.env.USDC_CONTRACT_ADDRESS,
		fee_limit: process.env.TRON_FEE_LIMIT || 150000000,
		activation_deposit: process.env.TRON_ACTIVATION_DEPOSIT || "1",
		re_fee_api_key: String(process.env.RE_FEE_API_KEY),
		re_fee_base_url: String(process.env.RE_FEE_BASE_URL),
		should_proceed_on_re_fee_failure: process.env.RE_FEE_SHOULD_PROCEED || "1",
	},
};

export default config;
