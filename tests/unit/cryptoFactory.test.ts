// @ts-nocheck
import CryptoServiceFactory from "../../src/Modules/CryptoServiceFactory";

class DummyQueue {}

// Create dummy service classes to observe constructor args
class DummyUSDTService {
	constructor(pk: string, resourceQ: any, balanceQ: any, activationQ: any) {
		this.pk = pk;
		this.resourceQ = resourceQ;
		this.balanceQ = balanceQ;
		this.activationQ = activationQ;
	}
}
class DummyTronService extends DummyUSDTService {}

// Mock KeyService to avoid reading files
jest.mock("../../src/Modules/Keys/KeyService", () => {
	return jest.fn().mockImplementation(() => {
		return {
			decryptKey: jest.fn().mockResolvedValue("mocked_private_key"),
		};
	});
});

// Replace real service modules with dummies
jest.mock("../../src/Modules/Tron/Services/USDTService", () => {
	return jest.fn().mockImplementation((pk: string, r: any, b: any, a: any) => {
		return new (class {
			pk = pk;
			r = r;
			b = b;
			a = a;
		})();
	});
});
jest.mock("../../src/Modules/Tron/Services/TronService", () => {
	return jest.fn().mockImplementation((pk: string, r: any, b: any, a: any) => {
		return new (class {
			pk = pk;
			r = r;
			b = b;
			a = a;
		})();
	});
});

import KeyService from "../../src/Modules/Keys/KeyService";
import USDTService from "../../src/Modules/Tron/Services/USDTService";
import TronService from "../../src/Modules/Tron/Services/TronService";

describe("CryptoServiceFactory", () => {
	const balanceQ = new DummyQueue();
	const resourceQ = new DummyQueue();
	const activationQ = new DummyQueue();

	const factory = new CryptoServiceFactory(
		balanceQ as any,
		resourceQ as any,
		activationQ as any,
	);

	test("creates USDTService for TRC20/USDTTRC20", async () => {
		const svc = await factory.createCryptoService("TRC20", "USDTTRC20", "big");
		expect(svc).toBeDefined();
		expect(svc.pk).toBe("mocked_private_key");
	});

	test("creates TronService for TRC20/TRX", async () => {
		const svc = await factory.createCryptoService("TRC20", "TRX", "big");
		expect(svc).toBeDefined();
		expect(svc.pk).toBe("mocked_private_key");
	});

	test("throws on unsupported", async () => {
		await expect(
			factory.createCryptoService("FOO", "BAR", "big"),
		).rejects.toThrow(/Unsupported network\/currency/);
	});
});
