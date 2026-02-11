import * as path from "path";
import * as fs from "fs/promises";
import * as crypto from "node:crypto";
import type { CipherGCM } from "crypto";
import config from "../../Core/config/config";
import { logger } from "../../Core/logger/logger";

const key = config.keys.appKey;
const algorithm = config.keys.algorithm;
const iv_length = parseInt(String(config.keys.iv_length));

export default class KeyService {
	async storeEncrypt(
		network: string,
		currency: string,
		type: string,
		privateKey: string,
		mnemonic: string,
	) {
		try {
			const storage_path = path.join("storage", network, currency, type);
			const file_path = path.join(storage_path, "key_encrypted.json");

			const iv = crypto.randomBytes(iv_length);
			const dataToEncrypt = JSON.stringify({
				privateKey: privateKey,
				mnemonic: mnemonic,
			});
			const cipher = crypto.createCipheriv(algorithm, key, iv) as CipherGCM;

			let encrypted = cipher.update(dataToEncrypt, "utf8", "hex");
			encrypted += cipher.final("hex");

			const authTag = cipher.getAuthTag();

			const encryptedData = {
				iv: iv.toString("hex"),
				data: encrypted,
				tag: authTag.toString("hex"),
				algorithm: algorithm,
				timestamp: new Date().toISOString(),
			};

			await fs.mkdir(storage_path, { recursive: true });
			await fs.writeFile(file_path, JSON.stringify(encryptedData, null, 2));

			return {
				success: true,
			};
		} catch (error: any) {
			logger.error(`Encryption error: ${error.message}`);
			return {
				code: error.code,
				success: false,
				error: error.message,
			};
		}
	}
	async decryptKey(network: string, currency: string, type: string) {
		try {
			const file_path = path.join(
				"storage",
				network,
				currency,
				type,
				"key_encrypted.json",
			);

			const encryptedData = JSON.parse(await fs.readFile(file_path, "utf8"));

			const decipher = crypto.createDecipheriv(
				encryptedData.algorithm,
				key,
				Buffer.from(encryptedData.iv, "hex"),
			);

			decipher.setAuthTag(Buffer.from(encryptedData.tag, "hex"));

			let decrypted = decipher.update(encryptedData.data, "hex", "utf8");
			decrypted += decipher.final("utf8");

			const data = await JSON.parse(decrypted);
			return data.privateKey;
		} catch (error: any) {
			logger.error(`Decryption error: ${error.message}`);
			throw error;
		}
	}
	async store(
		network: string,
		currency: string,
		type: string,
		privateKey: string,
		mnemonic: string,
	) {
		try {
			const storage_path = path.join("storage", network, currency, type);
			const file_path = path.join(storage_path, "keys.json");

			const data = {
				privateKey: privateKey,
				mnemonic: mnemonic,
			};
			const data_json = JSON.stringify(data, null, 2);

			await fs.mkdir(storage_path, { recursive: true });

			await fs.writeFile(file_path, data_json);

			return {
				code: 201,
				success: true,
			};
		} catch (error: any) {
			logger.error(`Storage error: ${error.message}`);
			return {
				code: error.code,
				success: false,
				error: error.message,
			};
		}
	}

	async getKey(network: string, currency: string, type: string) {
		try {
			const storage_path = path.join("storage", network, currency, type);
			const file_path = path.join(storage_path, "keys.json");

			const file = await fs.readFile(file_path);

			const data = await JSON.parse(file.toString("utf8"));

			return data.privateKey;
		} catch (error: any) {
			logger.error(`Error retrieving key: ${error.message}`);
			return false;
		}
	}

	async isStored(network: string, currency: string, type: string) {
		try {
			const storage_path = path.join("storage", network, currency, type);
			const file_path = path.join(storage_path, "keys.json");

			const file = await fs.readFile(file_path);
			if (file) {
				return true;
			} else {
				return false;
			}
		} catch (error: any) {
			logger.error(`Error checking if key is stored: ${error.message}`);
		}
	}

	async isEncrypted(network: string, currency: string, type: string) {
		try {
			const storage_path = path.join("storage", network, currency, type);
			const file_path = path.join(storage_path, "key_encrypted.json");

			const file = await fs.readFile(file_path);
			if (file) {
				return true;
			} else {
				return false;
			}
		} catch (error: any) {
			logger.error(`Error checking if key is encrypted: ${error.message}`);
		}
	}
}
