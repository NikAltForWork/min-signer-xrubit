// @ts-nocheck

// Mocks required modules before importing the service
jest.mock("../../src/Core/redis", () => ({
	getRedis: () => ({
		get: jest.fn().mockResolvedValue(null),
	}),
}));

jest.mock("../../src/Modules/Tron/Notification/NotificationService", () => {
	return jest.fn().mockImplementation(() => ({
		notifyStatus: jest.fn().mockResolvedValue(true),
		notify: jest.fn().mockResolvedValue(true),
	}));
});

jest.mock("../../src/Modules/Tron/Services/ReFeeService", () => {
	return jest.fn().mockImplementation(() => ({
		calculateEnergy: jest.fn().mockResolvedValue(10),
		rentResource: jest.fn().mockResolvedValue(true),
	}));
});

jest.mock("tronweb", () => {
	return jest.fn().mockImplementation((opts) => {
		return {
			toSun: (v: any) => v,
			address: {
				fromPrivateKey: () => (opts && opts.privateKey) || "TTESTADDRESS",
			},
			transactionBuilder: {
				triggerSmartContract: jest.fn().mockResolvedValue({
					transaction: { raw_data: {}, raw_data_hex: "aa" },
					txid: "TXID",
				}),
			},
			trx: {
				sign: jest.fn().mockResolvedValue("SIGNED"),
				sendRawTransaction: jest.fn().mockResolvedValue(true),
			},
			isAddress: () => true,
		};
	});
});

import USDTService from "../../src/Modules/Tron/Services/USDTService";

const DummyQueue = function () {
	return { addJob: jest.fn() };
};

describe("USDTService (unit)", () => {
	const balanceQ = new DummyQueue();
	const resourceQ = new DummyQueue();
	const activationQ = new DummyQueue();
	const svc = new USDTService(
		"testpk",
		resourceQ as any,
		balanceQ as any,
		activationQ as any,
	);

	afterEach(() => {
		jest.resetAllMocks();
	});

	test("sumTokenAmount: returns 0 on empty response", async () => {
		const res = await (svc as any).sumTokenAmount(null, svc.getContract());
		expect(res).toBe("0");
	});

	test("sumTokenAmount: aggregates values and applies decimals", async () => {
		const contract = svc.getContract();
		const response = {
			data: [
				{
					token_info: { address: contract, decimals: 6 },
					value: "1500000",
				},
				{
					token_info: { address: contract, decimals: 6 },
					value: "500000",
				},
			],
		};

		const total = await (svc as any).sumTokenAmount(response, contract);
		// 1500000 + 500000 = 2000000 -> decimals 6 -> 2
		expect(total).toBe("2");

		// fractional example
		const resp2 = {
			data: [
				{ token_info: { address: contract, decimals: 6 }, value: "1500000" },
			],
		};
		const t2 = await (svc as any).sumTokenAmount(resp2, contract);
		expect(t2).toBe("1.5");
	});

	test("getLastTransaction: returns tx id when present, else null", async () => {
		// mock global fetch
		(global as any).fetch = jest.fn().mockResolvedValue({
			json: async () => ({ data: [{ transaction_id: "tx123" }] }),
		});
		const tx = await svc.getLastTransaction("TADDR");
		expect(tx).toBe("tx123");

		(global as any).fetch = jest
			.fn()
			.mockResolvedValue({ json: async () => ({}) });
		const tx2 = await svc.getLastTransaction("TADDR");
		expect(tx2).toBeNull();
	});

	test("getBalance: reads trc20 balance and converts to human value", async () => {
		const contract = svc.getContract();
		(global as any).fetch = jest.fn().mockResolvedValue({
			json: async () => ({ data: [{ trc20: [{ [contract]: 2000000 }] }] }),
		});
		const bal = await svc.getBalance("TADDR");
		expect(bal).toBe(2);

		// no data path
		(global as any).fetch = jest
			.fn()
			.mockResolvedValue({ json: async () => ({}) });
		const bal2 = await svc.getBalance("TADDR");
		expect(bal2).toBe("0");
	});

	test("finishControlledTransaction returns early when wallet key missing", async () => {
		// mock connection.get to return null
		const fakeConn = { get: jest.fn().mockResolvedValue(null) };
		(svc as any).connection = fakeConn;

		const res = await svc.finishControlledTransaction({
			address: "TABC",
			balance: "1",
			id: "1",
		});
		expect(res).toBeUndefined();
	});

	test("finishFiatToCryptoTransaction signs and notifies", async () => {
		// prepare transaction result on triggerSmartContract
		(svc as any).tronWeb.transactionBuilder.triggerSmartContract = jest
			.fn()
			.mockResolvedValue({ transaction: { raw_data: {} }, txid: "TX123" });
		(svc as any).tronWeb.trx.sign = jest.fn().mockResolvedValue("SIGNED_TX");
		(svc as any).tronWeb.trx.sendRawTransaction = jest
			.fn()
			.mockResolvedValue(true);

		const spyNotify = (svc as any).notifier.notifyStatus;

		await svc.finishFiatToCryptoTransaction({
			network: "TRC20",
			currency: "USDTTRC20",
			type: "big",
			id: "id1",
			to: "TOADDR",
			amount: "1",
			callback: "cb",
		});

		expect(
			(svc as any).tronWeb.transactionBuilder.triggerSmartContract,
		).toHaveBeenCalled();
		expect((svc as any).tronWeb.trx.sign).toHaveBeenCalled();
		expect(spyNotify).toHaveBeenCalledWith(
			expect.objectContaining({ callback: "cb", id: "id1", tx_id: "TX123" }),
		);
	});

	test("finishActivationControl requests resources and enqueues resource job", async () => {
		// stub internal calculateBandwidth
		(svc as any).calculateBandwidth = jest.fn().mockResolvedValue(1200);
		// ensure reFee is mocked via module mock
		const rf = (svc as any).reFee;

		const addJobSpy = (svc as any).resource_queue.addJob;

		await svc.finishActivationControl({
			network: "TRC20",
			currency: "USDTTRC20",
			type: "big",
			to: "TO",
			amount: "1",
			id: "act1",
			isCryptoToFiat: false,
			callback: "cb",
		});

		expect((svc as any).calculateBandwidth).toHaveBeenCalled();
		expect(rf.calculateEnergy).toHaveBeenCalledWith("TO");
		expect(rf.rentResource).toHaveBeenCalled();
		expect(addJobSpy).toHaveBeenCalledWith(
			expect.objectContaining({ id: "act1", wallet: expect.any(String) }),
			"act1",
			expect.any(Number),
		);
	});

	test("finishControlledTransaction performs transfer when key present", async () => {
		// connection returns stored key
		const data = { privateKey: "innerpk" };
		const fakeConn = { get: jest.fn().mockResolvedValue(JSON.stringify(data)) };
		(svc as any).connection = fakeConn;

		// The signedTronWeb instance created inside method will use tronweb mock
		// Ensure the mock returns a transaction with txid and transaction.raw_data
		const mockedTron = require("tronweb");
		mockedTron.mockImplementationOnce((opts) => ({
			transactionBuilder: {
				triggerSmartContract: jest.fn().mockResolvedValue({
					transaction: { raw_data: {}, raw_data_hex: "aa" },
					txid: "TX_OK",
				}),
			},
			trx: {
				sign: jest.fn().mockResolvedValue("SIG"),
				sendRawTransaction: jest.fn().mockResolvedValue(true),
			},
			address: { fromPrivateKey: () => "MAINADDR" },
			toSun: (v) => v,
			isAddress: () => true,
		}));

		const res = await svc.finishControlledTransaction({
			address: "TADDR",
			balance: "1",
			id: "tx1",
		});
		expect(res).toBeDefined();
		expect(res.txid).toBe("TX_OK");
	});
});
