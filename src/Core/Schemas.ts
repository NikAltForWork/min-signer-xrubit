export const storeKeys = {
	body: {
		type: "object",
		properties: {
			privateKey: { type: "string" },
			mnemonic: { type: "string" },
		},
		required: ["privateKey"],
	},
	response: {
		201: {
			type: "object",
			properties: {
				success: true,
			},
		},
	},
};
export const storeTransaction = {
	body: {
		type: "object",
		properties: {
			address: { type: "string" },
			amount: { type: "number" },
            id: { type: "string" },

		},
		required: ["address", "amount"],
	},
};
export const getBalance = {
	body: {
		type: "object",
		properties: {
			address: { type: "string" },
		},
		required: ["address"],
	},
};
