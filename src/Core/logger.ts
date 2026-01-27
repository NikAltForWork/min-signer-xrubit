import pino from "pino";
import { LoggerOptions } from "pino";
import config from "./config/config";

export const loggerOptions: LoggerOptions = {
	level: config.logger.log_level,
	base: {
		service: "signer",
		env: config.server.env,
	},
	timestamp: () => `,"time":${new Date().toISOString()}`,
};

export const logger = pino(loggerOptions);
