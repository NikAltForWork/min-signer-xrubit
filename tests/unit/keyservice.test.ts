// @ts-nocheck
import KeyService from "../../src/Modules/Keys/KeyService";
import * as fs from "fs/promises";
import * as path from "path";

// Mock fs/promises with an in-memory store to avoid filesystem permission issues in CI
const inMemoryStore = new Map<string, string>();
jest.mock("fs/promises", () => ({
	mkdir: async (_path: string, _opts?: any) => {
		return; // noop
	},
	writeFile: async (file: string, data: string) => {
		inMemoryStore.set(file, data);
	},
	readFile: async (file: string, _enc?: any) => {
		const v = inMemoryStore.get(file);
		if (v === undefined) {
			const err: any = new Error(
				`ENOENT: no such file or directory, open '${file}'`,
			);
			err.code = "ENOENT";
			throw err;
		}
		return v;
	},
	stat: async (file: string) => {
		if (inMemoryStore.has(file)) return { isFile: () => true };
		const err: any = new Error(
			`ENOENT: no such file or directory, stat '${file}'`,
		);
		err.code = "ENOENT";
		throw err;
	},
	rm: async (p: string, _opts?: any) => {
		// remove any keys that start with path
		for (const k of Array.from(inMemoryStore.keys())) {
			if (k.startsWith(p)) inMemoryStore.delete(k);
		}
	},
}));

describe("KeyService", () => {
	const network = "TESTNET";
	const currency = "TRX";
	const type = "big";
	const storagePath = path.join("storage", network, currency, type);
	const filePath = path.join(storagePath, "key_encrypted.json");

	afterEach(async () => {
		try {
			await fs.rm(storagePath, { recursive: true, force: true });
			// ensure in-memory store cleared for mock
			try {
				inMemoryStore.clear();
			} catch (e) {}
		} catch (e) {
			// ignore
		}
	});

	test("storeEncrypt and decryptKey roundtrip", async () => {
		const ks = new KeyService();
		const privateKey = "0xdeadbeef";
		const mnemonic = "test mnemonic phrase";

		const res = await ks.storeEncrypt(
			network,
			currency,
			type,
			privateKey,
			mnemonic,
		);
		expect(res).toEqual({ success: true });

		const decrypted = await ks.decryptKey(network, currency, type);
		expect(decrypted).toBe(privateKey);

		// ensure file exists
		const stat = await fs.stat(filePath);
		expect(stat.isFile()).toBe(true);
	});

	test("isEncrypted and isStored behavior", async () => {
		const ks = new KeyService();
		// initially false
		const enc1 = await ks.isEncrypted(network, currency, type);
		const stored1 = await ks.isStored(network, currency, type);
		expect(enc1).toBeUndefined();
		expect(stored1).toBeUndefined();

		await ks.store(network, currency, type, "pk", "mn");
		const stored2 = await ks.isStored(network, currency, type);
		expect(stored2).toBe(true);
	});
});
