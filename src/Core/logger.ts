import pino from "pino";
import { LoggerOptions } from "pino";
import config from "./config/config";

export const loggerOptions: LoggerOptions = {
	level: config.logger.log_level || 'info',
	base: {
		service: "signer",
		env: config.server.env,
	},
	timestamp:
		config.server.env === "production"
			? pino.stdTimeFunctions.isoTime
			: () => `,"time":"${new Date().toISOString()}"`,

	formatters: {
		level: (label) => ({ level: label.toUpperCase() }),
	},
};

export const logger = pino(loggerOptions);
